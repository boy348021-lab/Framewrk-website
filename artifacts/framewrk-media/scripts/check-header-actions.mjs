import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const baseUrl = process.env.HEADER_CHECK_URL ?? 'http://127.0.0.1:25801/';
const chromiumPath = process.env.CHROMIUM_PATH ?? 'chromium';
const viewports = [
  { name: 'desktop', width: 1440, height: 900, textScale: 1 },
  { name: 'tablet-enlarged-text', width: 651, height: 900, textScale: 1.75 },
  { name: 'mobile-breakpoint', width: 650, height: 844, textScale: 1.75 },
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

async function evaluateHeader(cdp, isMobile, textScale) {
  const expression = `(async () => {
    const waitForHeader = () => new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const findHeader = () => {
        const header = document.querySelector('.fw-nav');
        if (header) {
          resolve(header);
          return;
        }
        if (performance.now() - startedAt > 5000) {
          reject(new Error('FrameWrk header did not render'));
          return;
        }
        requestAnimationFrame(findHeader);
      };
      findHeader();
    });

    const header = await waitForHeader();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const textScale = ${textScale};
    if (textScale > 1) {
      for (const element of header.querySelectorAll('.fw-nav-links a, .fw-cta, .fw-mobile-nav a')) {
        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
        if (Number.isFinite(fontSize)) element.style.fontSize = \`\${fontSize * textScale}px\`;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    const actions = header.querySelector('.fw-nav-actions');
    const cta = actions?.querySelector('.fw-cta');
    const themeToggle = actions?.querySelector('.fw-theme-toggle');
    const menu = header.querySelector('.fw-menu');
    const mobileNav = header.querySelector('.fw-mobile-nav');
    const headerRect = header.getBoundingClientRect();
    const themeRect = themeToggle?.getBoundingClientRect();
    const ctaRect = cta?.getBoundingClientRect();
    const themeStyle = themeToggle ? getComputedStyle(themeToggle) : null;
    const ctaStyle = cta ? getComputedStyle(cta) : null;
    const mobileNavStyleBefore = mobileNav ? getComputedStyle(mobileNav) : null;
    const readState = (themeName) => ({
      themeName,
      actionOrder: actions ? Array.from(actions.children).map((child) => child.className) : [],
      desktopCtaVisible: Boolean(cta && ctaStyle?.display !== 'none' && ctaRect?.width > 0),
      themeVisible: Boolean(themeToggle && themeStyle?.display !== 'none' && themeRect?.width > 0),
      themeLabel: themeToggle?.textContent.trim() ?? null,
      themeAriaLabel: themeToggle?.getAttribute('aria-label') ?? null,
      themeTitle: themeToggle?.getAttribute('title') ?? null,
      themePressed: themeToggle?.getAttribute('aria-pressed') ?? null,
      headerRect: { left: headerRect.left, right: headerRect.right, top: headerRect.top, bottom: headerRect.bottom },
      ctaRect: ctaRect ? { left: ctaRect.left, right: ctaRect.right, top: ctaRect.top, bottom: ctaRect.bottom } : null,
      themeRect: themeRect ? { left: themeRect.left, right: themeRect.right, top: themeRect.top, bottom: themeRect.bottom } : null,
      mobileActionCtaVisible: Boolean(cta && ctaStyle?.display !== 'none' && ctaRect?.width > 0),
      mobileNavDisplayBefore: mobileNavStyleBefore?.display ?? null,
      navLinks: Array.from(header.querySelectorAll('.fw-nav-links a')).map((link) => {
        const rect = link.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      }),
    });

    const initial = readState('dark');

    themeToggle?.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const lightThemeToggle = header.querySelector('.fw-theme-toggle');
    const lightThemeRect = lightThemeToggle?.getBoundingClientRect();
    const lightCta = actions?.querySelector('.fw-cta');
    const lightCtaRect = lightCta?.getBoundingClientRect();
    const lightHeaderRect = header.getBoundingClientRect();
    const lightThemeStyle = lightThemeToggle ? getComputedStyle(lightThemeToggle) : null;
    const lightCtaStyle = lightCta ? getComputedStyle(lightCta) : null;
    const light = {
      ...readState('light'),
      themeVisible: Boolean(lightThemeToggle && lightThemeStyle?.display !== 'none' && lightThemeRect?.width > 0),
      themeAriaLabel: lightThemeToggle?.getAttribute('aria-label') ?? null,
      themeTitle: lightThemeToggle?.getAttribute('title') ?? null,
      themePressed: lightThemeToggle?.getAttribute('aria-pressed') ?? null,
      headerRect: { left: lightHeaderRect.left, right: lightHeaderRect.right, top: lightHeaderRect.top, bottom: lightHeaderRect.bottom },
      ctaRect: lightCtaRect ? { left: lightCtaRect.left, right: lightCtaRect.right, top: lightCtaRect.top, bottom: lightCtaRect.bottom } : null,
      themeRect: lightThemeRect ? { left: lightThemeRect.left, right: lightThemeRect.right, top: lightThemeRect.top, bottom: lightThemeRect.bottom } : null,
      desktopCtaVisible: Boolean(lightCta && lightCtaStyle?.display !== 'none' && lightCtaRect?.width > 0),
    };

    if (${isMobile}) {
      menu?.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (textScale > 1) {
        for (const element of header.querySelectorAll('.fw-mobile-nav a')) {
          const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
          if (Number.isFinite(fontSize)) element.style.fontSize = \`\${fontSize * textScale}px\`;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    const renderedMobileNav = header.querySelector('.fw-mobile-nav');
    const mobileCta = renderedMobileNav
      ? Array.from(renderedMobileNav.querySelectorAll('a[href="#contact"]'))
        .find((link) => link.textContent.trim().startsWith('START A PROJECT'))
      : null;
    const mobileNavStyle = renderedMobileNav ? getComputedStyle(renderedMobileNav) : null;
    const mobileCtaRect = mobileCta?.getBoundingClientRect();
    const mobileNavRect = renderedMobileNav?.getBoundingClientRect();
    const afterMenu = {
      menuExpanded: menu?.getAttribute('aria-expanded') ?? null,
      mobileNavDisplay: mobileNavStyle?.display ?? null,
      mobileCtaText: mobileCta?.textContent.trim() ?? null,
      mobileCtaVisible: Boolean(mobileCta && mobileCtaStyle(mobileCta).display !== 'none' && mobileCtaRect?.width > 0),
      mobileCtaRect: mobileCtaRect ? { left: mobileCtaRect.left, right: mobileCtaRect.right, top: mobileCtaRect.top, bottom: mobileCtaRect.bottom } : null,
      mobileNavRect: mobileNavRect ? { left: mobileNavRect.left, right: mobileNavRect.right, top: mobileNavRect.top, bottom: mobileNavRect.bottom } : null,
    };

    function mobileCtaStyle(element) {
      return getComputedStyle(element);
    }

    return { initial, light, afterMenu };
  })()`;

  const result = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression,
  });

  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Header evaluation failed');
  }
  if (!result?.result?.value) {
    throw new Error('Chromium did not return header measurements');
  }
  return result.result.value;
}

function assertNear(actual, expected, tolerance, message, errors) {
  if (Math.abs(actual - expected) > tolerance) {
    errors.push(`${message} (expected ${expected.toFixed(1)} ± ${tolerance}px, got ${actual.toFixed(1)}px)`);
  }
}

function assertHeader(viewport, measurements) {
  const { initial, light, afterMenu } = measurements;
  const errors = [];
  for (const state of [initial, light]) {
    const [ctaClass, themeClass] = state.actionOrder;
    const isDark = state.themeName === 'dark';
    const actionHasClass = (className, requiredClass) =>
      className?.split(/\s+/).includes(requiredClass) ?? false;

    if (
      state.actionOrder.length !== 2 ||
      !actionHasClass(ctaClass, 'fw-cta') ||
      !actionHasClass(themeClass, 'fw-theme-toggle')
    ) {
      errors.push(`${state.themeName} action order is ${state.actionOrder.join(' → ') || '(empty)'}, expected fw-cta → fw-theme-toggle`);
    }
    if (!state.themeVisible) errors.push(`${state.themeName} theme control is not visible`);
    if (state.themeLabel !== '') errors.push(`${state.themeName} theme control has a visible text label: "${state.themeLabel}"`);
    const expectedAriaLabel = isDark ? 'Turn on the light theme' : 'Turn off the light theme';
    if (state.themeAriaLabel !== expectedAriaLabel) errors.push(`${state.themeName} theme accessible name is "${state.themeAriaLabel}"`);
    if (state.themeTitle !== state.themeAriaLabel) errors.push(`${state.themeName} theme title does not match its accessible name`);
    const expectedPressed = !isDark;
    if (state.themePressed !== String(expectedPressed)) errors.push(`${state.themeName} theme aria-pressed is "${state.themePressed}", expected ${expectedPressed}`);

    const themeRight = state.themeRect?.right;
    const headerRight = state.headerRect?.right;
    if (themeRight == null || headerRight == null) {
      errors.push(`${state.themeName} theme control or header has no rendered bounds`);
    } else {
      assertNear(themeRight, headerRight, 2, `${state.themeName} theme control is not flush with the header container’s right edge`, errors);
    }

    if (viewport.width > 650) {
      if (!state.desktopCtaVisible) errors.push(`${state.themeName} desktop Start a Project control is not visible`);
      if (state.ctaRect && state.themeRect && state.ctaRect.right >= state.themeRect.left) {
        errors.push(`${state.themeName} desktop Start a Project control is not immediately before the theme control`);
      }
      for (const linkRect of state.navLinks) {
        if (linkRect.width <= 0 || linkRect.height <= 0) errors.push(`${state.themeName} navigation link has no rendered bounds`);
        if (linkRect.left < state.headerRect.left - 1 || linkRect.right > state.headerRect.right + 1) {
          errors.push(`${state.themeName} navigation link extends outside the header bounds`);
        }
        for (const [actionName, actionRect] of [['Start a Project', state.ctaRect], ['theme control', state.themeRect]]) {
          if (actionRect && linkRect.right > actionRect.left && linkRect.left < actionRect.right) {
            errors.push(`${state.themeName} navigation link overlaps ${actionName}`);
          }
        }
      }
      if (afterMenu.mobileNavDisplay != null && afterMenu.mobileNavDisplay !== 'none') {
        errors.push(`${state.themeName} mobile navigation unexpectedly rendered at desktop width`);
      }
    } else {
      if (state.mobileActionCtaVisible) errors.push(`${state.themeName} desktop Start a Project control is visible at mobile width`);
      if (initial.themeRect && initial.menuExpanded) {
        errors.push(`${state.themeName} mobile menu was unexpectedly expanded before the check opened it`);
      }
      if (state.themeRect && state.headerRect && state.themeRect.right < state.headerRect.right - 2) {
        errors.push(`${state.themeName} theme control is not in the mobile header’s top-right position`);
      }
    }
  }

  if (viewport.width <= 650) {
    if (!afterMenu.menuExpanded || afterMenu.mobileNavDisplay === 'none') {
      errors.push('expanded mobile navigation did not render');
    }
    if (!afterMenu.mobileCtaVisible || !afterMenu.mobileCtaText?.startsWith('START A PROJECT')) {
      errors.push('Start a Project control is missing from the expanded mobile menu');
    }
  }

  if (errors.length > 0) {
    throw new Error(`${viewport.name}: ${errors.join('; ')}`);
  }

  if (viewport.width >= 600) {
    console.log(
      `✓ ${viewport.name}: Start a Project → theme icon order and right-edge alignment verified`,
    );
  } else {
    console.log(
      `✓ ${viewport.name}: theme icon stays top-right and Start a Project appears in the expanded menu`,
    );
  }
}

async function checkViewport(viewport) {
  const userDataDir = await mkdtemp(join(tmpdir(), 'framewrk-header-actions-'));
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
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 600,
    });

    const checkUrl = new URL(baseUrl);
    checkUrl.searchParams.set('header-check', '1');
    await cdp.send('Page.navigate', { url: checkUrl.toString() });
    await sleep(500);
    const measurements = await evaluateHeader(cdp, viewport.width <= 650, viewport.textScale);
    assertHeader(viewport, measurements);
    cdp.close();
  } finally {
    if (!browserExited) browser.kill('SIGTERM');
    await browserExit;
    await rm(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function main() {
  for (const viewport of viewports) {
    await checkViewport(viewport);
  }
  console.log('Header action order and enlarged-text separation passed for desktop, tablet, and mobile in light and dark themes.');
}

main().catch((error) => {
  console.error(`Header action order check failed: ${error.message}`);
  process.exitCode = 1;
});