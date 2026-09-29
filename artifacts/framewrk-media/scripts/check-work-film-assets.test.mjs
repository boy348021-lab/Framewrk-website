import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkWorkFilmAssets } from './check-work-film-assets.mjs';

async function makePublicDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'framewrk-work-films-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('checks static video references and ignores poster references', async (t) => {
  const directory = await makePublicDirectory(t);
  await writeFile(join(directory, 'event.mp4'), Buffer.from('valid media bytes'));
  const source = [
    "video: workFilmAsset('event.mp4'),",
    "poster: workFilmAsset('event.jpg'),",
  ].join('\n');

  const result = checkWorkFilmAssets(source, directory);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.checkedFiles, [{ filename: 'event.mp4', size: 17 }]);
});

test('rejects Git LFS pointer text even when the file is non-empty', async (t) => {
  const directory = await makePublicDirectory(t);
  await writeFile(
    join(directory, 'pointer.mp4'),
    'version https://git-lfs.github.com/spec/v1\n'
      + 'oid sha256:0123456789abcdef\n'
      + 'size 123456\n',
  );

  const result = checkWorkFilmAssets("video: workFilmAsset('pointer.mp4')", directory);

  assert.equal(result.checkedFiles.length, 0);
  assert.match(result.errors.join('\n'), /Git LFS pointer/);
});

test('rejects missing and empty video files', async (t) => {
  const directory = await makePublicDirectory(t);
  await writeFile(join(directory, 'empty.mp4'), '');
  const source = [
    "video: workFilmAsset('missing.mp4'),",
    "video: workFilmAsset('empty.mp4'),",
  ].join('\n');

  const result = checkWorkFilmAssets(source, directory);

  assert.match(result.errors.join('\n'), /missing\.mp4 is missing/);
  assert.match(result.errors.join('\n'), /empty\.mp4 is empty/);
});

test('requires at least one static video reference', () => {
  const result = checkWorkFilmAssets("poster: workFilmAsset('poster.jpg')", '/tmp/work-films');

  assert.match(result.errors.join('\n'), /No static work-film video references/);
});

test('rejects paths outside the public work-films directory', () => {
  const result = checkWorkFilmAssets("video: workFilmAsset('../outside.mp4')", '/tmp/work-films');

  assert.match(result.errors.join('\n'), /must be an MP4 filename directly inside/);
});