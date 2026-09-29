import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const baseUrl = process.env.WORK_GRID_CHECK_URL ?? 'http://127.0.0.1:25801/';
const chromiumPath = process.env.CHROMIUM_PATH ?? 'chromium';
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow-mobile', width: 230, height: 844 },
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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => { ${expression} })()`,
  });

  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Work-grid evaluation failed');
  }
  if (!result?.result?.value) {
    throw new Error('Chromium did not return work-grid measurements');
  }
  return result.result.value;
}

async function waitForWorkGrid(cdp) {
  return evaluate(cdp, `
    await new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const findGrid = () => {
        const grid = document.querySelector('.fw-projects');
        if (grid) {
          resolve();
          return;
        }
        if (performance.now() - startedAt > 5000) {
          reject(new Error('Selected Work grid did not render'));
          return;
        }
        requestAnimationFrame(findGrid);
      };
      findGrid();
    });
    document.querySelector('#work')?.scrollIntoView({ block: 'start' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const filmGrid = document.querySelector('.fw-projects');
    const cards = Array.from(filmGrid?.querySelectorAll('.fw-project-card') ?? []);
    await Promise.all(cards.map(async (card) => {
      const posterUrl = card.querySelector('video')?.poster;
      if (!posterUrl) return;
      const poster = new Image();
      poster.src = posterUrl;
      await poster.decode().catch(() => undefined);
    }));
    return true;
  `);
}

async function measureGrid(cdp) {
  return evaluate(cdp, `
    const grid = document.querySelector('.fw-projects');
    const cards = Array.from(grid?.querySelectorAll('.fw-project-card') ?? []);
    const style = grid ? getComputedStyle(grid) : null;
    const posterLoads = await Promise.all(cards.map(async (card) => {
      const posterUrl = card.querySelector('video')?.poster;
      if (!posterUrl) return false;
      const poster = new Image();
      poster.src = posterUrl;
      try {
        await poster.decode();
        return poster.naturalWidth > 0;
      } catch {
        return false;
      }
    }));
    return {
      gridColumns: style?.gridTemplateColumns ?? '',
      gap: style?.rowGap ?? '',
      columnGap: style?.columnGap ?? '',
      cards: cards.map((card, index) => {
        const cardStyle = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        const video = card.querySelector('video');
        return {
          marginTop: cardStyle.marginTop,
          transform: cardStyle.transform,
          offsetTop: card.offsetTop,
          offsetLeft: card.offsetLeft,
          offsetHeight: card.offsetHeight,
          rectTop: rect.top,
          rectLeft: rect.left,
          orientation: card.classList.contains('fw-work-film-card--landscape') ? 'landscape' : 'portrait',
          expanded: card.getAttribute('aria-expanded'),
          accessibleLabel: card.getAttribute('aria-label') ?? '',
          hasLoadedPoster: posterLoads[index],
          hasVideoSource: Boolean(video?.src.includes('/work-films/')),
          hasVisibleCaption: Boolean(card.querySelector('.fw-work-film-card__copy')?.textContent.trim()),
        };
      }),
    };
  `);
}

function assertGrid(
  viewport,
  filter,
  measurement,
  { checkRenderedTops = true, checkDefaultTransform = true } = {},
) {
  const errors = [];
  const cards = measurement.cards;

  if (cards.length !== 3) {
    errors.push(`expected 3 video cards, found ${cards.length}`);
  }

  const invalidFilmCards = cards.filter((card) =>
    !card.hasLoadedPoster
    || !card.hasVideoSource
    || !card.accessibleLabel.toLowerCase().includes('film')
    || !card.hasVisibleCaption
  );
  if (invalidFilmCards.length > 0) {
    errors.push(`${invalidFilmCards.length} card(s) are missing a loaded poster, video source, accessible name, or caption`);
  }

  const cardsWithMargins = cards.filter((card) => Math.abs(Number.parseFloat(card.marginTop)) > 0.01);
  if (cardsWithMargins.length > 0) {
    errors.push(`${cardsWithMargins.length} card(s) have an unintended top margin`);
  }

  if (checkDefaultTransform) {
    const transformedCards = cards.filter((card) => card.transform !== 'none');
    if (transformedCards.length > 0) {
      errors.push(`${transformedCards.length} card(s) have a default placement transform`);
    }
  }

  const rows = new Map();
  cards.forEach((card) => {
    const row = rows.get(card.offsetTop) ?? [];
    row.push(card);
    rows.set(card.offsetTop, row);
  });
  for (const [rowTop, row] of rows) {
    if (row.some((card) => card.offsetTop !== rowTop)) {
      errors.push(`row at offsetTop ${rowTop} is not aligned`);
    }
  }
  const orientations = cards.map((card) => card.orientation);
  if (orientations.join('|') !== 'landscape|portrait|portrait') {
    errors.push(`video order is ${orientations.join(', ')}, not landscape then two portraits`);
  }

  if (viewport.width <= 650) {
    if (measurement.gridColumns.trim().split(/\\s+/).length !== 1) {
      errors.push(`mobile grid has ${measurement.gridColumns} instead of one column`);
    }
    if (cards.some((card) => card.offsetLeft !== cards[0]?.offsetLeft)) {
      errors.push('mobile cards do not share one column');
    }
    const rowGap = Number.parseFloat(measurement.gap);
    for (let index = 1; index < cards.length; index += 1) {
      const expected = cards[index - 1].offsetTop + cards[index - 1].offsetHeight + rowGap;
      if (Math.abs(cards[index].offsetTop - expected) > 1) {
        errors.push(`mobile card ${index + 1} does not preserve the ${rowGap}px single-column gap`);
      }
    }
  } else if (cards.length > 1) {
    const rowSizes = [...rows.values()].map((row) => row.length);
    if (rowSizes.some((size) => size > 3)) {
      errors.push(`desktop/tablet row contains ${Math.max(...rowSizes)} cards`);
    }
    if (rowSizes.length !== 2 || rowSizes[0] !== 1 || rowSizes[1] !== 2) {
      errors.push(`desktop/tablet rows have ${rowSizes.join(',')} cards instead of 1 above 2`);
    } else {
      const [landscape] = [...rows.values()][0];
      const [leftPortrait, rightPortrait] = [...rows.values()][1];
      const rowGap = Number.parseFloat(measurement.gap);
      const columnGap = Number.parseFloat(measurement.columnGap);
      const expectedPortraitTop = landscape.offsetTop + landscape.offsetHeight + rowGap;
      const expectedRightLeft = leftPortrait.offsetLeft + leftPortrait.offsetWidth + columnGap;

      if (Math.abs(leftPortrait.offsetTop - expectedPortraitTop) > 1
        || Math.abs(rightPortrait.offsetTop - expectedPortraitTop) > 1) {
        errors.push('two portrait cards do not align directly below the landscape card');
      }
      if (Math.abs(leftPortrait.offsetTop - rightPortrait.offsetTop) > 1
        || Math.abs(leftPortrait.offsetHeight - rightPortrait.offsetHeight) > 1) {
        errors.push('portrait cards do not share an aligned row and equal height');
      }
      if (landscape.offsetLeft !== leftPortrait.offsetLeft
        || Math.abs(rightPortrait.offsetLeft - expectedRightLeft) > 2) {
        errors.push('landscape and portrait cards do not follow the shared grid columns');
      }
    }
    if (checkRenderedTops) {
      for (const row of rows.values()) {
        const rectTops = row.map((card) => card.rectTop);
        if (Math.max(...rectTops) - Math.min(...rectTops) > 1) {
          errors.push('desktop/tablet cards in a row have different rendered tops');
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`${viewport.name} / ${filter}: ${errors.join('; ')}`);
  }
}

async function measureMobileFooter(cdp) {
  return evaluate(cdp, `
    const links = document.querySelector('.fw-footer-links');
    const legal = links?.querySelector('.fw-footer-col:last-child');
    const style = links ? getComputedStyle(links) : null;
    return {
      columns: style?.gridTemplateColumns.trim().split(/\\s+/).length ?? 0,
      scrollWidth: links?.scrollWidth ?? 0,
      clientWidth: links?.clientWidth ?? 0,
      legalColumn: legal ? getComputedStyle(legal).gridColumn : '',
    };
  `);
}

function assertMobileFooter(viewport, measurement) {
  if (viewport.width > 650) return;
  if (measurement.columns !== 2) {
    throw new Error(`${viewport.name}: footer has ${measurement.columns} columns instead of two`);
  }
  if (measurement.scrollWidth > measurement.clientWidth + 1) {
    throw new Error(`${viewport.name}: footer links overflow horizontally`);
  }
  if (!measurement.legalColumn.includes('-1')) {
    throw new Error(`${viewport.name}: legal links do not span the footer grid`);
  }
}

async function measureHomepageFinishes(cdp) {
  return evaluate(cdp, `
    const hero = document.querySelector('.fw-hero');
    const heroMain = document.querySelector('.fw-hero-main');
    const services = document.querySelector('#services');
    const heroRect = hero?.getBoundingClientRect();
    const servicesRect = services?.getBoundingClientRect();
    const heroMainStyle = heroMain ? getComputedStyle(heroMain) : null;
    const footerLinks = document.querySelector('.fw-footer-links');
    const collaboration = document.querySelector('.fw-collab');
    const bulb = document.querySelector('.fw-hanging-bulb');
    const halo = bulb?.querySelector('.fw-bulb-halo');
    const svg = bulb?.querySelector('.fw-bulb-svg');
    const glass = bulb?.querySelector('.fw-bulb-glass-shape');
    const haloRect = halo?.getBoundingClientRect();
    const glassRect = glass?.getBoundingClientRect();
    return {
      heroLogoStripExists: Boolean(document.querySelector('.fw-hero-logo-strip')),
      heroMainPaddingBottom: heroMainStyle ? Number.parseFloat(heroMainStyle.paddingBottom) : Number.NaN,
      heroToServicesGap: heroRect && servicesRect ? servicesRect.top - heroRect.bottom : Number.NaN,
      footerHasClientLogos: Boolean(document.querySelector('.fw-footer-clients')),
      footerBackToTopExists: Boolean(document.querySelector('.fw-footer-bottom button[aria-label="Back to top"]')),
      scrollCueExists: Boolean(document.querySelector('.fw-scroll-cue')),
      footerLinksWidth: footerLinks?.getBoundingClientRect().width ?? 0,
      footerLinkColumnWidths: Array.from(footerLinks?.children ?? []).map((column) => column.getBoundingClientRect().width),
      collaborationColor: collaboration ? getComputedStyle(collaboration).color : '',
      collaborationBackground: collaboration ? getComputedStyle(collaboration).backgroundImage : '',
      haloZIndex: halo ? Number.parseInt(getComputedStyle(halo).zIndex, 10) : Number.NaN,
      bulbZIndex: svg ? Number.parseInt(getComputedStyle(svg).zIndex, 10) : Number.NaN,
      haloCenterX: haloRect ? haloRect.left + haloRect.width / 2 : Number.NaN,
      haloCenterY: haloRect ? haloRect.top + haloRect.height / 2 : Number.NaN,
      glassCenterX: glassRect ? glassRect.left + glassRect.width / 2 : Number.NaN,
      glassCenterY: glassRect ? glassRect.top + glassRect.height / 2 : Number.NaN,
    };
  `);
}

function assertHomepageFinishes(viewport, measurement) {
  if (measurement.heroLogoStripExists) {
    throw new Error(`${viewport.name}: the moving client-logo strip remains in the hero`);
  }
  if (measurement.footerHasClientLogos || measurement.footerBackToTopExists || measurement.scrollCueExists) {
    throw new Error(`${viewport.name}: an extra footer control or the old scroll cue remains`);
  }
  if (!Number.isFinite(measurement.heroMainPaddingBottom)
    || measurement.heroMainPaddingBottom > 20
    || !Number.isFinite(measurement.heroToServicesGap)
    || Math.abs(measurement.heroToServicesGap) > 1) {
    throw new Error(`${viewport.name}: the hero still reserves space for its removed logo strip `
      + `(bottom padding=${measurement.heroMainPaddingBottom}px, section gap=${measurement.heroToServicesGap}px)`);
  }
  if (viewport.width > 900 && (measurement.footerLinksWidth < 360
    || measurement.footerLinkColumnWidths.some((width) => width < 120))) {
    throw new Error(`${viewport.name}: desktop footer links are too narrow `
      + `(${measurement.footerLinksWidth}px, columns ${measurement.footerLinkColumnWidths.join(', ')}px)`);
  }
  if (measurement.collaborationColor !== 'rgb(32, 26, 54)'
    || !measurement.collaborationBackground.includes('rgb(247, 245, 255)')
    || !measurement.collaborationBackground.includes('rgb(240, 237, 255)')) {
    throw new Error(`${viewport.name}: People We've Created With is missing its themed lavender surface`);
  }
  if (!(measurement.haloZIndex < measurement.bulbZIndex)) {
    throw new Error(`${viewport.name}: bulb glow is not layered behind the bulb artwork`);
  }
  if (Math.abs(measurement.haloCenterX - measurement.glassCenterX) > 2
    || Math.abs(measurement.haloCenterY - measurement.glassCenterY) > 10) {
    throw new Error(`${viewport.name}: bulb glow is not centered behind the glass`);
  }
}

async function assertInteractions(cdp, viewport) {
  const initial = await measureGrid(cdp);

  await evaluate(cdp, `
    const card = document.querySelector('.fw-project-card');
    if (!card) throw new Error('No project card available for interaction checks');
    card.focus();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return true;
  `);
  const focused = await measureGrid(cdp);
  assertGrid(viewport, 'ALL after focus', focused, {
    checkRenderedTops: false,
    checkDefaultTransform: false,
  });

  const firstCard = focused.cards[0];
  const hoverPoint = await evaluate(cdp, `
    const card = document.querySelector('.fw-project-card');
    const rect = card.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  `);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: hoverPoint.x,
    y: hoverPoint.y,
  });
  await sleep(80);
  const hovered = await measureGrid(cdp);
  assertGrid(viewport, 'ALL after hover', hovered, {
    checkRenderedTops: false,
    checkDefaultTransform: false,
  });

  await evaluate(cdp, `
    document.querySelector('.fw-project-card')?.click();
    await new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const waitForPreview = () => {
        if (document.querySelector('.fw-case-study')) {
          resolve();
          return;
        }
        if (performance.now() - startedAt > 2000) {
          reject(new Error('Case-study preview did not open'));
          return;
        }
        requestAnimationFrame(waitForPreview);
      };
      waitForPreview();
    });
    return true;
  `);
  const opened = await measureGrid(cdp);
  assertGrid(viewport, 'ALL after open', opened, {
    checkRenderedTops: false,
    checkDefaultTransform: false,
  });
  const previewState = await evaluate(cdp, `
    const card = document.querySelector('.fw-project-card');
    const preview = document.querySelector('.fw-case-study');
    const close = preview?.querySelector('.fw-case-close');
    const cardVideo = card?.querySelector('video');
    const previewVideo = preview?.querySelector('video');
    close?.focus();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return {
      expanded: card?.getAttribute('aria-expanded'),
      dialogFocused: document.activeElement === preview,
      closeFocused: document.activeElement === close,
      playableVideo: Boolean(
        previewVideo?.controls
        && previewVideo.src === cardVideo?.src
        && preview?.querySelector('#work-film-preview-title')?.textContent.trim()
      ),
    };
  `);
  if (previewState.expanded !== 'true') {
    throw new Error(`${viewport.name} / ALL after open: active card is not expanded`);
  }
  if (!previewState.closeFocused) {
    throw new Error(`${viewport.name} / ALL after focus in preview: close control did not receive focus`);
  }
  if (!previewState.playableVideo) {
    throw new Error(`${viewport.name} / ALL after open: preview video or title is missing`);
  }

  await evaluate(cdp, `
    document.querySelector('.fw-case-close')?.click();
    await new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const waitForClose = () => {
        if (!document.querySelector('.fw-case-study')) {
          resolve();
          return;
        }
        if (performance.now() - startedAt > 2000) {
          reject(new Error('Case-study preview did not close'));
          return;
        }
        requestAnimationFrame(waitForClose);
      };
      waitForClose();
    });
    return true;
  `);
  const closed = await measureGrid(cdp);
  assertGrid(viewport, 'ALL after close', closed, {
    checkRenderedTops: false,
    checkDefaultTransform: false,
  });
  const restored = await evaluate(cdp, `
    const card = document.querySelector('.fw-project-card');
    return {
      focused: document.activeElement === card,
      expanded: card?.getAttribute('aria-expanded'),
    };
  `);
  if (!restored.focused || restored.expanded !== 'false') {
    throw new Error(`${viewport.name} / ALL after close: card focus or expanded state was not restored`);
  }

  const before = initial.cards.map((card) => `${card.offsetTop}:${card.offsetLeft}`);
  const after = closed.cards.map((card) => `${card.offsetTop}:${card.offsetLeft}`);
  if (before.join('|') !== after.join('|')) {
    throw new Error(
      `${viewport.name} / interaction: row-relative card placement changed after preview lifecycle `
      + `(before=${before.join('|')}, after=${after.join('|')})`,
    );
  }
}

async function waitForCardPausedState(cdp, shouldBePaused) {
  return evaluate(cdp, `
    const video = document.querySelector('.fw-work-film-card video');
    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 6000;
      const poll = () => {
        if (video && video.paused === ${shouldBePaused}) {
          resolve();
          return;
        }
        if (performance.now() > deadline) {
          reject(new Error('Card video did not reach the expected playback state'));
          return;
        }
        setTimeout(poll, 50);
      };
      poll();
    });
    return true;
  `);
}

async function assertReducedMotionPlayback(cdp) {
  await evaluate(cdp, `
    document.querySelector('.fw-work-film-card')?.scrollIntoView({ block: 'center' });
    return true;
  `);
  await waitForCardPausedState(cdp, false);

  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await waitForCardPausedState(cdp, true);

  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await waitForCardPausedState(cdp, false);
}

async function checkViewport(viewport) {
  const userDataDir = await mkdtemp(join(tmpdir(), 'framewrk-work-grid-'));
  const browser = spawn(chromiumPath, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
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
    await cdp.send('Page.navigate', { url: baseUrl });
    await waitForWorkGrid(cdp);
    if (viewport.name === 'desktop') {
      await assertReducedMotionPlayback(cdp);
    }

    const measurement = await measureGrid(cdp);
    assertGrid(viewport, 'selected work', measurement);
    assertMobileFooter(viewport, await measureMobileFooter(cdp));
    assertHomepageFinishes(viewport, await measureHomepageFinishes(cdp));
    if (viewport.width > 650) {
      await assertInteractions(cdp, viewport);
    }

    console.log(`✓ ${viewport.name}: video cards and ${viewport.width > 650 ? 'preview interactions' : 'mobile spacing'} verified`);
    cdp.close();
  } finally {
    if (!browserExited) browser.kill('SIGTERM');
    await browserExit;
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

async function main() {
  for (const viewport of viewports) {
    await checkViewport(viewport);
  }
  console.log('Selected Work video-grid check passed.');
}

main().catch((error) => {
  console.error(`Selected Work video-grid check failed: ${error.message}`);
  process.exitCode = 1;
});