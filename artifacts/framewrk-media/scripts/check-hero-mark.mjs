import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.HERO_CHECK_URL ?? 'http://127.0.0.1:25801/';
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = process.env.HERO_CHECK_OUTPUT ?? join(packageDir, 'hero-mark-snapshots');
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 900 },
  { name: 'mobile-narrow', width: 390, height: 844 },
];

function readPngDimensions(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('capture is not a PNG');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const checkUrl = new URL(baseUrl);
  checkUrl.searchParams.set('hero-fallback', '1');

  for (const viewport of viewports) {
    const outputPath = join(outputDir, `${viewport.name}.png`);
    execFileSync('chromium', [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-prefers-reduced-motion',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=1200',
      `--window-size=${viewport.width},${viewport.height}`,
      `--screenshot=${outputPath}`,
      checkUrl.toString(),
    ], { stdio: 'ignore', timeout: 30_000 });

    const capture = await readFile(outputPath);
    const dimensions = readPngDimensions(capture);
    if (dimensions.width !== viewport.width || dimensions.height !== viewport.height) {
      throw new Error(
        `${viewport.name}: expected ${viewport.width}x${viewport.height}, got ${dimensions.width}x${dimensions.height}`,
      );
    }
    if (capture.byteLength < 10_000) {
      throw new Error(`${viewport.name}: screenshot is unexpectedly small`);
    }
    console.log(`${viewport.name}: ${dimensions.width}x${dimensions.height} fallback capture saved to ${outputPath}`);
  }

  console.log('Hero mark responsive capture check passed.');
}

main().catch((error) => {
  console.error(`Hero mark check failed: ${error.message}`);
  process.exitCode = 1;
});