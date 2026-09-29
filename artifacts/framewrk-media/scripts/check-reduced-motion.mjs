import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = process.env.HERO_CHECK_URL ?? 'http://127.0.0.1:25801/';
const chromiumPath = process.env.CHROMIUM_PATH ?? 'chromium';
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebuggerUrl(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolve(match[1]);
    };

    child.stderr.on('data', onData);
    child.once('error', reject);
    child.once('exit', (code) => {
      reject(new Error(`Chromium exited before opening DevTools (code ${code})`));
    });
  });
}

async function waitForPageTarget(port) {
  const endpoint = `http://127.0.0.1:${port}/json/list`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chromium may need a few milliseconds before its HTTP debugger is ready.
    }
    await sleep(50);
  }

  throw new Error('Timed out waiting for the Chromium page target');
}

function connectToCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chromium DevTools')));
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return {
    ready,
    send,
    close: () => socket.close(),
  };
}

async function evaluateHeroMark(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const waitForHeroMark = () => new Promise((resolve, reject) => {
        const startedAt = performance.now();
        const findMark = () => {
          const mark = document.querySelector('.fw-hero-mark');
          if (mark) {
            resolve(mark);
            return;
          }
          if (performance.now() - startedAt > 5000) {
            reject(new Error('Hero mark did not render'));
            return;
          }
          requestAnimationFrame(findMark);
        };
        findMark();
      });

      const mark = await waitForHeroMark();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const logo = mark.querySelector('.fw-hero-logo');
      const orbit = mark.querySelector('.fw-hero-orbit');
      const dot = mark.querySelector('.fw-hero-orbit i');
      const markStyle = getComputedStyle(mark);
       const logoStyle = getComputedStyle(logo);
      const orbitStyle = getComputedStyle(orbit);
      const logoRect = logo.getBoundingClientRect();
       const maskValue = logoStyle.maskImage || logoStyle.webkitMaskImage;
       const maskSource = maskValue.match(/url\\(["']?(.*?)["']?\\)/)?.[1];
       let logoLoaded = false;
       if (maskSource) {
         const maskImage = new Image();
         maskImage.src = maskSource;
         logoLoaded = await maskImage.decode().then(() => maskImage.naturalWidth > 0).catch(() => false);
       }
      const dotBefore = dot.getBoundingClientRect();
      const initial = {
         logoLoaded,
        logoVisible: logoRect.width > 0 && logoRect.height > 0,
        dotVisible: dotBefore.width > 0 && dotBefore.height > 0,
        markOpacity: markStyle.opacity,
        markAnimation: markStyle.animationName,
        orbitAnimation: orbitStyle.animationName,
        orbitDuration: orbitStyle.animationDuration,
        orbitIterations: orbitStyle.animationIterationCount,
        dotBefore: { x: dotBefore.x, y: dotBefore.y },
      };

      await new Promise((resolve) => setTimeout(resolve, 300));
      const dotAfter = dot.getBoundingClientRect();
      return {
        ...initial,
        dotAfter: { x: dotAfter.x, y: dotAfter.y },
      };
    })()`,
  });

  if (!result?.result?.value) {
    throw new Error('Chromium did not return hero mark measurements');
  }
  return result.result.value;
}

function assertHeroMarkStable(viewport, measurements) {
  const errors = [];

  if (!measurements.logoLoaded) errors.push('hero logo image did not load');
  if (!measurements.logoVisible) errors.push('hero logo did not render');
  if (!measurements.dotVisible) errors.push('hero orbit dot did not render');
  if (measurements.markOpacity !== '1') errors.push(`hero mark opacity is ${measurements.markOpacity}`);
  if (measurements.markAnimation !== 'none') errors.push(`hero entrance animation is ${measurements.markAnimation}`);
  if (measurements.orbitAnimation !== 'none') errors.push(`orbit animation is ${measurements.orbitAnimation}`);

  const delta = Math.hypot(
    measurements.dotAfter.x - measurements.dotBefore.x,
    measurements.dotAfter.y - measurements.dotBefore.y,
  );
  if (delta > 0.5) errors.push(`orbit dot moved ${delta.toFixed(2)}px after reduced-motion settle`);

  if (errors.length > 0) {
    throw new Error(`${viewport.name}: ${errors.join('; ')}`);
  }

  console.log(
    `${viewport.name}: reduced-motion hero mark rendered and dot stayed stable `
      + `(animation=${measurements.orbitAnimation}, movement=${delta.toFixed(2)}px)`,
  );
}

async function checkViewport(viewport) {
  const userDataDir = await mkdtemp(join(tmpdir(), 'framewrk-reduced-motion-'));
  const browser = spawn(chromiumPath, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let browserExited = false;
  const browserExit = new Promise((resolve) => {
    browser.once('exit', () => {
      browserExited = true;
      resolve();
    });
  });

  try {
    const browserWebSocketUrl = await waitForDebuggerUrl(browser);
    const port = new URL(browserWebSocketUrl).port;
    const pageWebSocketUrl = await waitForPageTarget(port);
    const cdp = connectToCdp(pageWebSocketUrl);
    await cdp.ready;
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 600,
    });

    const checkUrl = new URL(baseUrl);
    checkUrl.searchParams.set('hero-fallback', '1');
    await cdp.send('Page.navigate', { url: checkUrl.toString() });
    await sleep(500);
    const measurements = await evaluateHeroMark(cdp);
    assertHeroMarkStable(viewport, measurements);
    cdp.close();
  } finally {
    if (!browserExited) browser.kill('SIGTERM');
    await browserExit;
    await rm(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
}

async function main() {
  for (const viewport of viewports) {
    await checkViewport(viewport);
  }
  console.log('Reduced-motion hero mark check passed.');
}

main().catch((error) => {
  console.error(`Reduced-motion hero mark check failed: ${error.message}`);
  process.exitCode = 1;
});