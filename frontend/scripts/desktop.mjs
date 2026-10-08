// Run frontend tools with the same Node executable as npm, even when native CLI shells use another PATH.
import { spawn } from 'node:child_process';
const node = process.execPath;
const args = process.argv.slice(2);
const platform = ['ios', 'android'].includes(args[0]) ? args.shift() : null;
const dev = args.shift() === 'dev';
function run(file, params) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, [file, ...params], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${file} exited with ${code}`)));
  });
}
let vite;
try {
  if (Number(process.versions.node.split('.')[0]) < 18) throw new Error('Node.js 18+ required; use Node.js 22 LTS');
  if (dev) {
    vite = spawn(node, ['node_modules/vite/bin/vite.js', '--host', platform ? '0.0.0.0' : '127.0.0.1'], { stdio: 'inherit' });
  } else {
    await run('node_modules/vue-tsc/bin/vue-tsc.js', ['--noEmit']);
    await run('node_modules/vite/bin/vite.js', ['build']);
  }
  await run('node_modules/@tauri-apps/cli/tauri.js', [...(platform ? [platform] : []), dev ? 'dev' : 'build', '--config', JSON.stringify({ build: { beforeBuildCommand: '', beforeDevCommand: '' } }), ...args]);
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { vite?.kill(); }
