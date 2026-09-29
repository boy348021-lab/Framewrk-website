import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  { name: 'header actions', script: 'check-header-actions.mjs' },
  { name: 'hero rendering', script: 'check-hero-mark.mjs' },
  { name: 'reduced motion', script: 'check-reduced-motion.mjs' },
  { name: 'contrast', script: 'check-contrast.mjs' },
];

function runCheck(check) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(packageDir, 'scripts', check.script)], {
      cwd: packageDir,
      env: process.env,
      stdio: 'inherit',
    });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.once('error', (error) => {
      finish({ code: 1, signal: null, error });
    });
    child.once('close', (code, signal) => {
      finish({ code: code ?? 1, signal, error: null });
    });
  });
}

async function main() {
  console.log('Running FrameWrk release browser checks in order:');
  console.log(`  ${checks.map((check) => check.name).join(' → ')}`);

  for (const check of checks) {
    console.log(`\n▶ ${check.name}`);
    const result = await runCheck(check);

    if (result.code !== 0) {
      const reason = result.error
        ? result.error.message
        : result.signal
          ? `terminated by ${result.signal}`
          : `exited with code ${result.code}`;
      console.error(`\n✗ Release browser check failed: ${check.name} (${reason}).`);
      process.exitCode = result.code;
      return;
    }

    console.log(`✓ Release browser check passed: ${check.name}`);
  }

  console.log('\nAll FrameWrk release browser checks passed.');
}

main().catch((error) => {
  console.error(`Release browser checks failed: ${error.message}`);
  process.exitCode = 1;
});