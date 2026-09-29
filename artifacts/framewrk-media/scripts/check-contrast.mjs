import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = process.env.CONTRAST_CHECK_URL ?? 'http://127.0.0.1:25801/';
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

async function evaluateContrast(cdp) {
  const result = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      await new Promise((resolve, reject) => {
        const startedAt = performance.now();
        const waitForShell = () => {
          if (document.querySelector('.fw-shell')) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 5000) {
            reject(new Error('FrameWrk shell did not render'));
            return;
          }
          requestAnimationFrame(waitForShell);
        };
        waitForShell();
      });

      const root = document.documentElement;
      const themeToggle = document.querySelector('.fw-theme-toggle');
      if (!themeToggle) {
        throw new Error('FrameWrk theme toggle did not render');
      }

      const waitForTheme = (expectedTheme) => new Promise((resolve, reject) => {
        const startedAt = performance.now();
        const expectedPressed = String(expectedTheme === 'light');
        const checkTheme = () => {
          if (
            root.dataset.theme === expectedTheme
            && themeToggle.getAttribute('aria-pressed') === expectedPressed
          ) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 5000) {
            reject(new Error('FrameWrk theme did not settle on ' + expectedTheme));
            return;
          }
          requestAnimationFrame(checkTheme);
        };
        checkTheme();
      });

      // Begin in the initial Violet Night state, then exercise the live theme
      // path in both directions before measuring the rendered dark theme again.
      await waitForTheme('dark');
      themeToggle.click();
      await waitForTheme('light');
      themeToggle.click();
      await waitForTheme('dark');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const rootStyle = getComputedStyle(root);
      const tokens = Object.fromEntries([
        '--dark',
        '--hero-bg',
        '--surface',
        '--card-bg',
        '--footer-bg',
        '--section-text',
        '--violet',
        '--violet-deep',
        '--lavender',
        '--button-ink',
      ].map((name) => [name, rootStyle.getPropertyValue(name).trim()]));

      const parseColor = (value) => {
        if (!value) return null;
        const hex = value.match(/^#([0-9a-f]{3,8})$/i);
        if (hex) {
          const digits = hex[1];
          const expanded = digits.length <= 4
            ? digits.split('').map((digit) => digit + digit).join('')
            : digits;
          return {
            r: Number.parseInt(expanded.slice(0, 2), 16),
            g: Number.parseInt(expanded.slice(2, 4), 16),
            b: Number.parseInt(expanded.slice(4, 6), 16),
            a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
          };
        }

        const channels = value.match(/^rgba?\\(([^)]+)\\)$/i);
        const srgb = value.match(/^color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)$/i);
        const oklab = value.match(/^oklab\\(\\s*([+-]?[\\d.]+%?)\\s+([+-]?[\\d.]+%?)\\s+([+-]?[\\d.]+%?)(?:\\s*\\/\\s*([+-]?[\\d.]+%?))?\\s*\\)$/i);
        if (srgb) {
          return {
            r: Number.parseFloat(srgb[1]) * 255,
            g: Number.parseFloat(srgb[2]) * 255,
            b: Number.parseFloat(srgb[3]) * 255,
            a: srgb[4] === undefined ? 1 : Number.parseFloat(srgb[4]),
          };
        }
        if (oklab) {
          const component = (part, percentageScale) => {
            const amount = Number.parseFloat(part);
            return part.endsWith('%') ? amount * percentageScale : amount;
          };
          const lightness = component(oklab[1], 0.01);
          const labA = component(oklab[2], 0.004);
          const labB = component(oklab[3], 0.004);
          const lRoot = lightness + 0.3963377774 * labA + 0.2158037573 * labB;
          const mRoot = lightness - 0.1055613458 * labA - 0.0638541728 * labB;
          const sRoot = lightness - 0.0894841775 * labA - 1.2914855480 * labB;
          const l = lRoot ** 3;
          const m = mRoot ** 3;
          const s = sRoot ** 3;
          const encode = (channel) => {
            const encoded = channel <= 0.0031308
              ? 12.92 * channel
              : 1.055 * Math.pow(Math.max(channel, 0), 1 / 2.4) - 0.055;
            return Math.max(0, Math.min(1, encoded)) * 255;
          };
          const alpha = oklab[4] === undefined
            ? 1
            : component(oklab[4], 0.01);
          return {
            r: encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            g: encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            b: encode(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
            a: Math.max(0, Math.min(1, alpha)),
          };
        }
        if (!channels) return null;
        const parts = channels[1].split(',').map((part) => part.trim());
        const alpha = parts[3] === undefined
          ? 1
          : Number.parseFloat(parts[3].replace('%', '')) / (parts[3].includes('%') ? 100 : 1);
        return {
          r: Number.parseFloat(parts[0]),
          g: Number.parseFloat(parts[1]),
          b: Number.parseFloat(parts[2]),
          a: Number.isFinite(alpha) ? alpha : 1,
        };
      };

      const composite = (foreground, background) => {
        if (!foreground || !background) return null;
        const alpha = foreground.a ?? 1;
        return {
          r: foreground.r * alpha + background.r * (1 - alpha),
          g: foreground.g * alpha + background.g * (1 - alpha),
          b: foreground.b * alpha + background.b * (1 - alpha),
          a: 1,
        };
      };

      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      };

      const luminance = (color) =>
        0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);

      const ratio = (foreground, background) => {
        const lighter = luminance(foreground);
        const darker = luminance(background);
        return (Math.max(lighter, darker) + 0.05) / (Math.min(lighter, darker) + 0.05);
      };

      const splitCssList = (value) => {
        const parts = [];
        let part = '';
        let depth = 0;
        for (const character of value) {
          if (character === '(') depth += 1;
          if (character === ')') depth -= 1;
          if (character === ',' && depth === 0) {
            parts.push(part.trim());
            part = '';
          } else {
            part += character;
          }
        }
        if (part.trim()) parts.push(part.trim());
        return parts;
      };

      const parseGradient = (value) => {
        const match = value.match(/^linear-gradient\\((.*)\\)$/i);
        if (!match) return null;

        const parts = splitCssList(match[1]);
        if (parts.length < 2) return null;

        let angle = 180;
        const angleMatch = parts[0].match(/^(-?(?:\\d*\\.)?\\d+)(deg|rad|turn)$/i);
        if (angleMatch) {
          const numericAngle = Number.parseFloat(angleMatch[1]);
          angle = angleMatch[2].toLowerCase() === 'rad'
            ? numericAngle * 180 / Math.PI
            : angleMatch[2].toLowerCase() === 'turn'
              ? numericAngle * 360
              : numericAngle;
          parts.shift();
        } else if (/^to\\s+right$/i.test(parts[0])) {
          angle = 90;
          parts.shift();
        } else if (/^to\\s+left$/i.test(parts[0])) {
          angle = 270;
          parts.shift();
        }

        const stops = parts.map((part, index) => {
          const stopMatch = part.match(/^(.*(?:\\)|#[0-9a-f]{3,8}|[a-z]+))(?:\\s+(-?(?:\\d*\\.)?\\d+%?))?$/i);
          if (!stopMatch) return null;
          const color = parseColor(stopMatch[1].trim());
          if (!color) return null;
          return {
            color,
            position: stopMatch[2] === undefined
              ? index / Math.max(parts.length - 1, 1)
              : Number.parseFloat(stopMatch[2]) / (stopMatch[2].includes('%') ? 100 : 1),
          };
        });

        if (stops.some((stop) => !stop)) return null;
        return {
          direction: {
            x: Math.sin(angle * Math.PI / 180),
            y: -Math.cos(angle * Math.PI / 180),
          },
          stops,
        };
      };

      const sampleGradient = (gradient, x, y, width, height) => {
        const denominator = Math.abs(gradient.direction.x) + Math.abs(gradient.direction.y);
        const position = Math.max(0, Math.min(1, .5 + (
          ((x / width) - .5) * gradient.direction.x
          + ((y / height) - .5) * gradient.direction.y
        ) / denominator));
        const nextStopIndex = gradient.stops.findIndex((stop) => stop.position >= position);
        if (nextStopIndex <= 0) return gradient.stops[0].color;
        if (nextStopIndex === -1) return gradient.stops[gradient.stops.length - 1].color;

        const previous = gradient.stops[nextStopIndex - 1];
        const next = gradient.stops[nextStopIndex];
        const distance = next.position - previous.position || 1;
        const amount = (position - previous.position) / distance;
        return {
          r: previous.color.r + (next.color.r - previous.color.r) * amount,
          g: previous.color.g + (next.color.g - previous.color.g) * amount,
          b: previous.color.b + (next.color.b - previous.color.b) * amount,
          a: 1,
        };
      };

      const checks = [];
      const addCheck = (label, foregroundValue, backgroundToken, minimum, details = '') => {
        const foreground = composite(parseColor(foregroundValue), parseColor(tokens[backgroundToken]));
        const background = parseColor(tokens[backgroundToken]);
        if (!foreground || !background) {
          checks.push({
            label,
            passed: false,
            ratio: null,
            minimum,
            details: details + ' (could not parse ' + (foregroundValue || 'empty color') + ' against ' + backgroundToken + ')',
          });
          return;
        }

        const measured = ratio(foreground, background);
        checks.push({
          label,
          passed: measured >= minimum,
          ratio: measured,
          minimum,
          details,
        });
      };

      const addProjectArtworkCheck = (artwork, labelElement, labelKind, cardIndex) => {
        const artworkVariant = [...artwork.classList].find((className) => className.startsWith('fw-project-art-')) ?? 'unknown-artwork';
        const label = 'project card ' + String(cardIndex + 1).padStart(2, '0') + ' ' + labelKind + ' on ' + artworkVariant;
        const minimum = 3;
        const style = getComputedStyle(labelElement);
        const text = parseColor(style.color);
        const gradient = parseGradient(getComputedStyle(artwork).backgroundImage);
        const artworkRect = artwork.getBoundingClientRect();
        const labelRect = labelElement.getBoundingClientRect();
        const sampleFractions = [
          [0.2, 0.2],
          [0.5, 0.2],
          [0.8, 0.2],
          [0.2, 0.5],
          [0.5, 0.5],
          [0.8, 0.5],
          [0.2, 0.8],
          [0.5, 0.8],
          [0.8, 0.8],
        ];

        if (!text || !gradient || artworkRect.width <= 0 || artworkRect.height <= 0 || labelRect.width <= 0 || labelRect.height <= 0) {
          checks.push({
            label,
            passed: false,
            ratio: null,
            minimum,
            details: 'could not sample the rendered label or artwork gradient',
          });
          return;
        }

        const samples = sampleFractions.map(([xFraction, yFraction]) => {
          const x = labelRect.left + labelRect.width * xFraction - artworkRect.left;
          const y = labelRect.top + labelRect.height * yFraction - artworkRect.top;
          const background = sampleGradient(gradient, x, y, artworkRect.width, artworkRect.height);
          return ratio(composite(text, background), background);
        });
        const measured = Math.min(...samples);
        checks.push({
          label,
          passed: measured >= minimum,
          ratio: measured,
          minimum,
          details: labelElement.tagName.toLowerCase() + ' color sampled at ' + samples.length + ' points across the rendered artwork',
        });
      };

      const addStyleCheck = (label, selector, property, backgroundToken, minimum, pseudo = '') => {
        const element = document.querySelector(selector);
        if (!element) {
          checks.push({ label, passed: false, ratio: null, minimum, details: 'missing ' + selector });
          return;
        }
        const style = getComputedStyle(element, pseudo);
        addCheck(label, style.getPropertyValue(property), backgroundToken, minimum, selector + ' ' + property);
      };

      // Primary and secondary copy on the layered indigo sections.
      addStyleCheck('primary text on dark surface', '.fw-dark-section h2', 'color', '--surface', 4.5);
      addStyleCheck('muted section copy on dark surface', '.fw-dark-section .fw-section-head > p', 'color', '--surface', 4.5);
      addStyleCheck('navigation copy on hero surface', '.fw-nav-links a', 'color', '--hero-bg', 4.5);
      addStyleCheck('footer secondary copy on footer surface', '.fw-footer-statement', 'color', '--footer-bg', 4.5);

      // Normal and active controls, including the mobile navigation CTA.
      if (window.innerWidth < 600) {
        document.querySelector('.fw-menu')?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      addStyleCheck('primary button text on violet', '.fw-solid-cta', 'color', '--violet', 4.5);
      addStyleCheck('form button text on violet', '.fw-form-submit', 'color', '--violet', 4.5);
      addStyleCheck('inactive collaboration tab text on dark surface', '.fw-collab-tab:not(.active)', 'color', '--surface', 4.5);
      addStyleCheck('active collaboration tab text on dark surface', '.fw-collab-tab.active', 'color', '--surface', 4.5);
      addStyleCheck('theme toggle icon on hero surface', '.fw-theme-toggle', 'color', '--hero-bg', 3);
      if (window.innerWidth < 600) {
        addStyleCheck('mobile navigation link on hero surface', '.fw-mobile-nav a', 'color', '--hero-bg', 4.5);
        addStyleCheck('mobile navigation CTA text on violet', '.fw-mobile-nav a:last-child', 'color', '--violet', 4.5);
      }

      // Work cards pair an autoplaying preview with a loaded poster and visible caption.
      const projectCards = [...document.querySelectorAll('.fw-project-card')];
      if (projectCards.length === 0) {
        checks.push({
          label: 'work video-card fixture',
          passed: false,
          details: 'no selected-work video cards rendered',
        });
      } else {
        projectCards.forEach((card, cardIndex) => {
          const video = card.querySelector('video');
          const accessibleName = card.getAttribute('aria-label') ?? '';
          const passed = Boolean(
            video?.src.includes('/work-films/')
            && video.poster.includes('/work-films/')
            && accessibleName.toLowerCase().includes('film')
            && card.querySelector('.fw-work-film-card__copy')?.textContent.trim()
          );
          checks.push({
            label: 'work video card ' + String(cardIndex + 1).padStart(2, '0'),
            passed,
            details: passed
              ? 'video source, poster, accessible button name, and visible caption'
              : 'missing video source, poster, accessible film name, or caption',
          });
        });
      }

      // Focus indicators are a non-text control state and need 3:1 against each surface.
      addCheck('focus outline on dark surface', tokens['--lavender'], '--surface', 3, '--lavender outline');
      addCheck('focus outline on project card', tokens['--lavender'], '--card-bg', 3, '--lavender outline');

      // Form text, placeholders, borders, and the focused input state.
      addStyleCheck('form label on contact surface', '.fw-field label', 'color', '--dark', 4.5);
      addStyleCheck('form input text on contact surface', '.fw-field input', 'color', '--dark', 4.5);
      addStyleCheck('form input placeholder on contact surface', '.fw-field input', 'color', '--dark', 4.5, '::placeholder');
      addStyleCheck('form input border on contact surface', '.fw-field input', 'border-bottom-color', '--dark', 3);
      const input = document.querySelector('.fw-field input');
      if (input) {
        input.focus();
        addCheck(
          'focused form input border on contact surface',
          getComputedStyle(input).borderBottomColor,
          '--dark',
          3,
          '.fw-field input:focus border-bottom-color',
        );
      }

      // The success state is rendered by the real form handler, not a duplicate fixture.
      const form = document.querySelector('.fw-form');
      if (form) {
        for (const field of form.querySelectorAll('input[required], textarea[required]')) {
          field.value = field.type === 'email' ? 'contrast@example.com' : 'contrast check';
        }
        const realFetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
          const requestUrl = typeof input === 'string' ? input : input?.url;
          if (requestUrl && new URL(requestUrl, location.href).pathname === '/api/contact') {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return realFetch(input, init);
        };
        form.requestSubmit();
        const submitStartedAt = performance.now();
        while (!document.querySelector('.fw-form-success')) {
          if (performance.now() - submitStartedAt > 2000) {
            throw new Error('Contact form did not render its success state.');
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        window.fetch = realFetch;
      }
      addStyleCheck('form success message on contact surface', '.fw-form-success', 'color', '--dark', 4.5);

      return {
        tokens,
        checks,
        mobileMenuRendered: Boolean(document.querySelector('.fw-mobile-nav')),
      };
    })()`,
  });

  if (result?.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description
        ?? result.exceptionDetails.exception?.value
        ?? result.exceptionDetails.text
        ?? 'Chromium contrast evaluation failed',
    );
  }
  if (!result?.result?.value || !Array.isArray(result.result.value.checks)) {
    throw new Error('Chromium did not return contrast measurements');
  }
  return result.result.value;
}

function formatCheck(check) {
  if (check.ratio === undefined) {
    return `${check.label}${check.details ? ` (${check.details})` : ''}`;
  }
  const ratio = check.ratio === null ? 'unmeasurable' : `${check.ratio.toFixed(2)}:1`;
  return `${check.label} (${ratio}, required ${check.minimum}:1${check.details ? `; ${check.details}` : ''})`;
}

function assertContrast(viewport, measurements) {
  const failures = measurements.checks.filter((check) => !check.passed);

  if (viewport.width < 600 && !measurements.mobileMenuRendered) {
    failures.push({
      label: 'mobile navigation contrast fixture',
      ratio: null,
      minimum: 4.5,
      details: 'mobile navigation did not render',
    });
  }

  if (failures.length > 0) {
    throw new Error(`${viewport.name}: ${failures.map(formatCheck).join('; ')}`);
  }

  for (const check of measurements.checks) {
    console.log(`  ✓ ${viewport.name}: ${formatCheck(check)}`);
  }
}

async function checkViewport(viewport) {
  const userDataDir = await mkdtemp(join(tmpdir(), 'framewrk-contrast-'));
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
    checkUrl.searchParams.set('contrast-check', '1');
    await cdp.send('Page.navigate', { url: checkUrl.toString() });
    await sleep(500);
    await cdp.send('Runtime.evaluate', {
      expression: "window.localStorage.setItem('framewrk-theme', 'dark');",
    });
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(500);
    const measurements = await evaluateContrast(cdp);
    assertContrast(viewport, measurements);
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
  console.log('Violet Night contrast check passed for desktop and mobile.');
}

main().catch((error) => {
  console.error(`Violet Night contrast check failed: ${error.message}`);
  process.exitCode = 1;
});