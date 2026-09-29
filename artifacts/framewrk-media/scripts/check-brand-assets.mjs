#!/usr/bin/env node
/**
 * Brand-asset integrity check for FrameWrk Media.
 *
 * Verifies:
 *  1. Each PNG brand asset file exists on disk, is non-empty, and has a valid
 *     PNG magic-byte signature (first 8 bytes: 89 50 4E 47 0D 0A 1A 0A).
 *  2. index.html references the favicon with the correct MIME type (image/png).
 *  3. App.tsx imports and renders the nav logo (white PNG) in the nav bar.
 *  4. The Who We Are component imports and renders the theme-specific logos.
 *  5. App.tsx renders the footer logo (second usage of white PNG).
 *
 * Asset paths are resolved using the same alias rules as vite.config.ts:
 *   @assets  →  <workspace-root>/attached_assets/
 *
 * Exit code 0 = all checks pass.
 * Exit code 1 = one or more checks failed (details printed to stderr).
 */

import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
// artifact root: artifacts/framewrk-media
const artifactRoot = resolve(__dir, '..');
// workspace root: two levels up from artifact root
const workspaceRoot = resolve(artifactRoot, '..', '..');
// @assets alias (mirrors vite.config.ts)
const assetsDir = resolve(artifactRoot, '..', '..', 'attached_assets');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF_MAGIC = Buffer.from('GIF8');

let failures = 0;

function pass(msg) { console.log(`  ✓  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); failures++; }

/**
 * Read the first `n` bytes of a file without loading the whole thing.
 */
function readHead(filePath, n) {
  const fd = openSync(filePath, 'r');
  const buf = Buffer.alloc(n);
  const bytesRead = readSync(fd, buf, 0, n, 0);
  closeSync(fd);
  return buf.slice(0, bytesRead);
}

/**
 * Validate that a path exists, is a non-empty regular file, and begins with
 * the PNG magic bytes. Returns true on success, emits fail() entries otherwise.
 */
function validatePng(label, filePath) {
  if (!existsSync(filePath)) {
    fail(`${label} — file not found: ${filePath}`);
    return false;
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    fail(`${label} — path is not a regular file: ${filePath}`);
    return false;
  }
  if (stat.size === 0) {
    fail(`${label} — file is empty: ${filePath}`);
    return false;
  }
  if (stat.size < 8) {
    fail(`${label} — file too small to be a valid PNG (${stat.size} bytes): ${filePath}`);
    return false;
  }
  const head = readHead(filePath, 8);
  if (!head.equals(PNG_MAGIC)) {
    fail(
      `${label} — invalid PNG signature (got ${head.toString('hex')}, ` +
      `expected ${PNG_MAGIC.toString('hex')}): ${filePath}`
    );
    return false;
  }
  pass(`${label} — valid PNG, ${stat.size} bytes`);
  return true;
}

function validateGif(label, filePath) {
  if (!existsSync(filePath)) {
    fail(`${label} — file not found: ${filePath}`);
    return false;
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    fail(`${label} — path is not a regular file: ${filePath}`);
    return false;
  }
  if (stat.size < GIF_MAGIC.length) {
    fail(`${label} — file too small to be a valid GIF (${stat.size} bytes): ${filePath}`);
    return false;
  }
  const head = readHead(filePath, GIF_MAGIC.length);
  if (!head.equals(GIF_MAGIC)) {
    fail(`${label} — invalid GIF signature: ${filePath}`);
    return false;
  }
  pass(`${label} — valid GIF, ${stat.size} bytes`);
  return true;
}

// ── Read source files ────────────────────────────────────────────────────────
const htmlPath = resolve(artifactRoot, 'index.html');
const appPath  = resolve(artifactRoot, 'src', 'App.tsx');
const aboutPath = resolve(artifactRoot, 'src', 'components', 'who-we-are.tsx');

let html = '';
let app  = '';
let about = '';

if (existsSync(htmlPath)) {
  html = readFileSync(htmlPath, 'utf8');
} else {
  fail('index.html not found');
}

if (existsSync(appPath)) {
  app = readFileSync(appPath, 'utf8');
} else {
  fail('src/App.tsx not found');
}

if (existsSync(aboutPath)) {
  about = readFileSync(aboutPath, 'utf8');
} else {
  fail('src/components/who-we-are.tsx not found');
}

// ── 1. Favicon on disk with valid PNG signature ──────────────────────────────
console.log('\nFavicon');
validatePng('public/favicon.png', resolve(artifactRoot, 'public', 'favicon.png'));

// ── 2. Favicon link in index.html ────────────────────────────────────────────
console.log('\nindex.html');
const faviconLinkOk =
  /rel=["']icon["'][^>]+type=["']image\/png["'][^>]+href=["']\/favicon\.png["']/.test(html) ||
  /rel=["']icon["'][^>]+href=["']\/favicon\.png["'][^>]+type=["']image\/png["']/.test(html);

if (faviconLinkOk) {
  pass('<link rel="icon" type="image/png" href="/favicon.png"> present');
} else {
  fail('<link rel="icon" type="image/png" href="/favicon.png"> missing or MIME type wrong');
}

// ── 3–5. Resolve @assets imports and validate each logo file on disk ──────────
console.log('\nLogo asset files');

// Extract imported PNG/GIF paths from the app and its Who We Are section.
const importRe = /import\s+(\w+)\s+from\s+['"](@assets\/[^'"]+\.(?:png|gif))['"]/g;
const imports = {};  // varName → { aliasPath, resolvedPath }
let m;
while ((m = importRe.exec(`${app}\n${about}`)) !== null) {
  const [, varName, aliasPath] = m;
  const relativePart = aliasPath.replace('@assets/', '');
  imports[varName] = {
    aliasPath,
    resolvedPath: resolve(assetsDir, relativePart),
  };
}

if (Object.keys(imports).length === 0) {
  fail('No @assets PNG imports found in App.tsx or Who We Are component');
}

// Validate each imported file
for (const [varName, { aliasPath, resolvedPath }] of Object.entries(imports)) {
  if (aliasPath.endsWith('.gif')) {
    validateGif(`${aliasPath} (${varName})`, resolvedPath);
  } else {
    validatePng(`${aliasPath} (${varName})`, resolvedPath);
  }
}

// ── 6. Verify specific logo variables are imported and used in JSX ────────────
console.log('\nApp and Who We Are logo references');

function findVar(pattern, source = app, extension = '(?:png|gif)') {
  const re = new RegExp(
    `import\\s+(\\w+)\\s+from\\s+['"][^'"]*${pattern}[^'"]*\\.${extension}['"]`
  );
  const match = source.match(re);
  return match ? match[1] : null;
}

function usedInJSX(varName, source = app) {
  if (!varName) return false;
  return new RegExp(`src(?:Set)?=\\{[^}]*\\b${varName}\\b[^}]*\\}`).test(source);
}

const whiteVar  = findVar('FWM_WHITE_LOGO');
const aboutBlackVar = findVar('FWM_Black_LOGO_H', about);
const aboutWhiteVar = findVar('FWM_WHITE_LOGO_1790008840051', about);
const heroIconVar = findVar('fwm-hero-icon');

function checkVar(label, varName, source = app) {
  if (!varName) { fail(`${label} — import not found`); return; }
  if (usedInJSX(varName, source)) {
    pass(`${label} — imported as ${varName}, rendered in JSX`);
  } else {
    fail(`${label} — imported as ${varName} but no src={${varName}} / srcSet={${varName}} in JSX`);
  }
}

checkVar('Header/footer wordmark (white PNG)', whiteVar);
checkVar('About light-theme logo (supplied black horizontal PNG)', aboutBlackVar, about);
checkVar('About dark-theme logo (supplied white horizontal PNG)', aboutWhiteVar, about);

const headerWordmarkUsesFullLogo = Boolean(
  whiteVar &&
  app.includes('fw-header-wordmark') &&
  new RegExp(`src=\\{\\s*${whiteVar}\\s*\\}`).test(app) &&
  app.includes("theme === 'light' ? 'is-light' : ''"),
);

if (headerWordmarkUsesFullLogo) {
  pass('Header logo — full theme-aware wordmark rendered');
} else if (heroIconVar && new RegExp(`url\\(\\$\\{${heroIconVar}\\}\\)`).test(app)) {
  pass(`Header logo — hero icon used as a mask (${heroIconVar})`);
} else {
  fail('Header logo — full wordmark or legacy hero icon reference not found');
}

// The full wordmark is reused in the header and footer.
const whiteUses = whiteVar
  ? (app.match(new RegExp(`src=\\{[^}]*\\b${whiteVar}\\b[^}]*\\}`, 'g')) || []).length
  : 0;

if (whiteUses >= 2) {
  pass(`Header/footer wordmark — white PNG used ${whiteUses}× with a light-theme contrast class`);
} else {
  fail(
    `Header/footer wordmark — white PNG used ${whiteUses}× in JSX, expected ≥ 2`
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('Brand asset check passed — all files valid, all references intact.');
} else {
  console.error(`Brand asset check FAILED — ${failures} issue(s) found.`);
  process.exit(1);
}
