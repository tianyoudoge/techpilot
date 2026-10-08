// Keep desktop and mobile app icons in sync with the same SVG used inside the app.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const brand = await readFile(new URL('../src/assets/brand-mark.svg', import.meta.url), 'utf8');
const artwork = brand.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1];
if (!artwork) throw new Error('The brand SVG has no artwork');
// Safe margins retain the speech-bubble tail and sparkle under platform icon masks.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 80 80" fill="none"><rect x="2" y="2" width="76" height="76" rx="17" fill="#F5F7FC"/><g transform="translate(11 10) scale(.9)">${artwork}</g></svg>\n`;
await writeFile(new URL('../src-tauri/app-icon.svg', import.meta.url), icon);
await writeFile(new URL('../public/favicon.svg', import.meta.url), brand);
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/@tauri-apps/cli/tauri.js', 'icon', 'src-tauri/app-icon.svg', '--ios-color', '#F5F7FC'], { cwd: frontend, stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Icon generation exited with ${code}`)));
});
