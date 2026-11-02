const { spawnSync } = require('node:child_process');

const isWindows = process.platform === 'win32';
const command = isWindows ? 'py' : 'python3';
const args = [...(isWindows ? ['-3'] : []), 'scripts/build.py'];
const result = spawnSync(command, args, { stdio: 'inherit' });

if (result.error) {
  console.error(`Could not start ${command}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
