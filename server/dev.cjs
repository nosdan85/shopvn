const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const vitePackageJson = require.resolve('vite/package.json');
const viteBin = path.join(path.dirname(vitePackageJson), 'bin', 'vite.js');
const apiEntry = path.join(__dirname, 'index.cjs');
const viteArgs = process.argv.slice(2);
const children = new Set();
let shuttingDown = false;

function killChildren() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

function runProcess(label, entry, args = []) {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });
  children.add(child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    if (signal) {
      console.error(`${label} stopped with signal ${signal}.`);
    } else if (code && code !== 0) {
      console.error(`${label} exited with code ${code}.`);
    }
    killChildren();
    process.exit(code || 0);
  });
  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    killChildren();
    process.exit(1);
  });
  return child;
}

runProcess('API server', apiEntry);
runProcess('Vite dev server', viteBin, viteArgs);

process.on('SIGINT', () => {
  killChildren();
  process.exit(0);
});
process.on('SIGTERM', () => {
  killChildren();
  process.exit(0);
});
