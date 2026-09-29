import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const checkerPath = fileURLToPath(new URL('./check-brand-assets.mjs', import.meta.url));
const pngMagic = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const gifMagic = Buffer.from('GIF89a');

const appFixture = `import whiteLogo from '@assets/FWM_WHITE_LOGO.png';
import aboutBlackLogo from '@assets/FWM_Black_LOGO_H_1790008840051.png';
import aboutWhiteLogo from '@assets/FWM_WHITE_LOGO_1790008840051.png';
import aboutLogoReveal from '@assets/FWM_logo_left_to_right_reveal_transparent.gif';

export function App() {
  return (
    <>
      <a className="fw-logo-link">
        <img className={\`fw-header-wordmark \${theme === 'light' ? 'is-light' : ''}\`} src={whiteLogo} />
      </a>
      <img src={whiteLogo} />
      <img src={whiteLogo} />
      <img src={aboutBlackLogo} />
      <img src={aboutWhiteLogo} />
      <img src={aboutLogoReveal} />
    </>
  );
}
`;

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'framewrk-brand-assets-'));
  const artifactRoot = join(root, 'artifacts', 'framewrk-media');
  const assetsRoot = join(root, 'attached_assets');

  mkdirSync(join(artifactRoot, 'scripts'), { recursive: true });
  mkdirSync(join(artifactRoot, 'public'), { recursive: true });
  mkdirSync(join(artifactRoot, 'src'), { recursive: true });
  mkdirSync(assetsRoot, { recursive: true });

  copyFileSync(checkerPath, join(artifactRoot, 'scripts', 'check-brand-assets.mjs'));
  writeFileSync(
    join(artifactRoot, 'index.html'),
    '<link rel="icon" type="image/png" href="/favicon.png">\n',
  );
  writeFileSync(join(artifactRoot, 'src', 'App.tsx'), appFixture);
  writeFileSync(join(artifactRoot, 'public', 'favicon.png'), Buffer.concat([pngMagic, Buffer.from([0x00])]));

  for (const assetName of [
    'FWM_WHITE_LOGO.png',
    'FWM_Black_LOGO_H_1790008840051.png',
    'FWM_WHITE_LOGO_1790008840051.png',
  ]) {
    writeFileSync(join(assetsRoot, assetName), Buffer.concat([pngMagic, Buffer.from([0x00])]));
  }
  writeFileSync(
    join(assetsRoot, 'FWM_logo_left_to_right_reveal_transparent.gif'),
    Buffer.concat([gifMagic, Buffer.from([0x00])]),
  );

  return {
    root,
    artifactRoot,
    assetsRoot,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function runChecker(fixture) {
  const result = spawnSync(
    process.execPath,
    [join(fixture.artifactRoot, 'scripts', 'check-brand-assets.mjs')],
    { cwd: fixture.root, encoding: 'utf8' },
  );

  assert.equal(result.error, undefined, result.error?.message);
  return {
    ...result,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

test('accepts an isolated fixture with valid brand assets', () => {
  const fixture = createFixture();
  try {
    const result = runChecker(fixture);
    assert.equal(result.status, 0, result.output);
  } finally {
    fixture.cleanup();
  }
});

test('reports missing brand files with an actionable diagnostic', () => {
  const fixture = createFixture();
  try {
    unlinkSync(join(fixture.assetsRoot, 'FWM_WHITE_LOGO.png'));

    const result = runChecker(fixture);
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /@assets\/FWM_WHITE_LOGO\.png .*file not found/);
  } finally {
    fixture.cleanup();
  }
});

test('reports invalid PNG signatures with an actionable diagnostic', () => {
  const fixture = createFixture();
  try {
    writeFileSync(join(fixture.artifactRoot, 'public', 'favicon.png'), Buffer.from('not-a-png'));

    const result = runChecker(fixture);
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /public\/favicon\.png .*invalid PNG signature/);
  } finally {
    fixture.cleanup();
  }
});

test('reports missing favicon metadata with an actionable diagnostic', () => {
  const fixture = createFixture();
  try {
    writeFileSync(
      join(fixture.artifactRoot, 'index.html'),
      '<link rel="icon" href="/favicon.png" type="image/svg+xml">\n',
    );

    const result = runChecker(fixture);
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /favicon.*missing or MIME type wrong/i);
  } finally {
    fixture.cleanup();
  }
});

test('reports missing JSX logo references with an actionable diagnostic', () => {
  const fixture = createFixture();
  try {
    writeFileSync(
      join(fixture.artifactRoot, 'src', 'App.tsx'),
      appFixture
        .replace(/        <img className=\{`fw-header-wordmark \$\{theme === 'light' \? 'is-light' : ''\}`} src=\{whiteLogo\} \/>[\r\n]/, ''),
    );

    const result = runChecker(fixture);
    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /Header logo — full wordmark or legacy hero icon reference not found/);
  } finally {
    fixture.cleanup();
  }
});