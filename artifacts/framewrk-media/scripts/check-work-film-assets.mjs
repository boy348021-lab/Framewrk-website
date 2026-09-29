import { closeSync, lstatSync, openSync, readFileSync, readSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const lfsPointerHeader = /^version https:\/\/git-lfs\.github\.com\/spec\/v1(?:\r?\n|$)/;

function readHead(filePath, byteCount) {
  const descriptor = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(byteCount);
    const bytesRead = readSync(descriptor, buffer, 0, byteCount, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    closeSync(descriptor);
  }
}

export function checkWorkFilmAssets(source, publicDirectory) {
  const videoReferences = [
    ...new Set(
      Array.from(
        source.matchAll(/\bvideo\s*:\s*workFilmAsset\(\s*(['"])([^'"]+)\1\s*\)/g),
        (match) => match[2],
      ),
    ),
  ];
  const errors = [];
  const checkedFiles = [];

  if (videoReferences.length === 0) {
    errors.push('No static work-film video references were found in site-content.ts.');
  }

  const workFilmsDirectory = resolve(publicDirectory);
  for (const filename of videoReferences) {
    if (
      basename(filename) !== filename
      || filename.includes('\\')
      || extname(filename).toLowerCase() !== '.mp4'
    ) {
      errors.push(`${filename} must be an MP4 filename directly inside public/work-films.`);
      continue;
    }

    const filePath = resolve(workFilmsDirectory, filename);
    let stats;
    try {
      stats = lstatSync(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        errors.push(`${filename} is missing from public/work-films.`);
      } else {
        errors.push(`${filename} could not be inspected: ${error.message}`);
      }
      continue;
    }

    if (!stats.isFile()) {
      errors.push(`${filename} is not a regular file.`);
      continue;
    }
    if (stats.size === 0) {
      errors.push(`${filename} is empty.`);
      continue;
    }

    const header = readHead(filePath, 128).toString('utf8').replace(/^\uFEFF/, '');
    if (lfsPointerHeader.test(header)) {
      errors.push(`${filename} contains a Git LFS pointer instead of video media.`);
      continue;
    }

    checkedFiles.push({ filename, size: stats.size });
  }

  return { checkedFiles, errors };
}

function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const artifactRoot = resolve(scriptDirectory, '..');
  const contentPath = resolve(artifactRoot, 'src', 'content', 'site-content.ts');
  const workFilmsDirectory = resolve(artifactRoot, 'public', 'work-films');

  let source;
  try {
    source = readFileSync(contentPath, 'utf8');
  } catch (error) {
    console.error(`Could not read work-film content data: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = checkWorkFilmAssets(source, workFilmsDirectory);
  for (const { filename, size } of result.checkedFiles) {
    console.log(`  ✓  ${filename} — ${size.toLocaleString()} bytes`);
  }
  for (const error of result.errors) {
    console.error(`  ✗  ${error}`);
  }

  if (result.errors.length > 0) {
    console.error(`Work-film asset check failed with ${result.errors.length} issue(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Work-film asset check passed — ${result.checkedFiles.length} video file(s) verified.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}