import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('native HTTP scope permits the configured LAN asset endpoint and both model providers', async ({ page }) => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/capabilities/default.json', import.meta.url), 'utf8'));
  const patterns = config.permissions.find((p: any) => p.identifier === 'http:default').allow.map((p: any) => p.url);
  await page.goto('/');
  const results = await page.evaluate(async patterns => {
    const path = '/src/lib/platform.ts';
    const { ASSET_SERVICE_BASE } = await import(/* @vite-ignore */ path);
    return [`${ASSET_SERVICE_BASE}/api/v1/assets/bundle`, `${ASSET_SERVICE_BASE}/api/v1/assets/contributions`, 'https://api.deepseek.com/chat/completions', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'].map(url => {
      const allowed = patterns.some((raw: string) => {
        // Match the HTTP plugin's URLPattern normalization for unspecified paths/query/fragment.
        const pattern = new (window as any).URLPattern(raw);
        return new (window as any).URLPattern({ protocol: pattern.protocol, hostname: pattern.hostname, port: pattern.port, pathname: pattern.pathname === '/' ? '*' : pattern.pathname, search: pattern.search || '*', hash: pattern.hash || '*' }).test(url);
      });
      return { url, allowed };
    });
  }, patterns);
  for (const result of results) expect(result.allowed, result.url).toBe(true);
});

test('asset loading preserves string errors returned by native HTTP commands', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).isTauri = true;
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' });
    (window as any).__TAURI_INTERNALS__ = { invoke: () => Promise.reject('url not allowed on the configured scope') };
  });
  await page.goto('/');
  const error = await page.evaluate(async () => {
    const path = '/src/lib/assets.ts';
    const assets = await import(/* @vite-ignore */ path);
    try { await assets.loadAssetBundle(); return ''; }
    catch (error) { return (error as Error).message; }
  });
  expect(error).toContain('知识资产加载失败');
  expect(error).toContain('url not allowed on the configured scope');
});

test('iOS asset bundle loads through WebView while model calls still use native HTTP', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).isTauri = true;
    (window as any).__TAURI_INTERNALS__ = { invoke: (command: string) => Promise.reject(`native:${command}`) };
  });
  const bundle = { schemaVersion: 1, version: 'ios-v1', taxonomy: [], assets: [], sharedAssets: [], withdrawnIds: [] };
  await page.route('**/api/v1/assets/bundle', route => route.fulfill({ json: { code: 0, data: bundle } }));
  await page.route('**/api/v1/assets/contributions', route => route.fulfill({ json: { code: 0, data: { id: 'ios-contribution' } } }));
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const assetsPath = '/src/lib/assets.ts'; const platformPath = '/src/lib/platform.ts';
    const assets = await import(/* @vite-ignore */ assetsPath); const platform = await import(/* @vite-ignore */ platformPath);
    const bundle = await assets.loadAssetBundle();
    const upload = await (await platform.platformFetch(`${platform.ASSET_SERVICE_BASE}/api/v1/assets/contributions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    let modelError = '';
    try { await platform.platformFetch('https://api.deepseek.com/chat/completions'); } catch (error) { modelError = String(error); }
    return { version: bundle.version, id: upload.data.id, modelError };
  });
  expect(results).toEqual({ version: 'ios-v1', id: 'ios-contribution', modelError: 'native:plugin:http|fetch' });
});
