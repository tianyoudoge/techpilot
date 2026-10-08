import { test, expect } from '@playwright/test';

test('real light server: one client uploads, operator publishes, another client reuses and observes withdrawal', async ({ page, browser, request }) => {
  test.skip(!process.env.UI_PRODUCTION_URL || !process.env.ASSET_TEST_ADMIN_TOKEN, 'Requires isolated light server and its test operator token');
  const server = process.env.UI_PRODUCTION_URL!;
  const authorization = `Bearer ${process.env.ASSET_TEST_ADMIN_TOKEN}`;
  const getBundle = async () => (await (await request.get(`${server}/api/v1/assets/bundle`)).json()).data;
  const initial = await getBundle();
  const point = initial.assets.find((p: any) => p.grade === 1 && p.name.includes('加'));
  expect(point).toBeTruthy();
  const content = `验收${Date.now()}：有2个苹果，又拿来1个，共几个？`;
  const input = { schemaVersion: 1, kind: 'standard', knowledgePointId: point.id, grade: point.grade, chapterId: point.chapterId, difficulty: 1, audience: 'child', generatorModel: 'test-only', promptVersion: 'smoke-v1', content: { content, answer: '3', solutionSteps: ['2加1等于3'], variationReason: '' }, review: { correct: true, reason: '测试数据独立验算2+1=3', independentAnswer: '3' } };
  await page.addInitScript(server => localStorage.setItem('jianghui-service-base', server), server);
  await page.goto('/');
  const localId = await page.evaluate(async input => {
    const path = '/src/lib/assets.ts'; const assets = await import(/* @vite-ignore */ path);
    const asset = await assets.rememberAsset(input); await assets.flushAssetOutbox(true); return asset.id;
  }, input);
  const receipt = await page.evaluate(async localId => {
    const path = '/src/lib/client-store.ts'; const store = await import(/* @vite-ignore */ path);
    return (await store.all('receipts')).find((r: any) => r.localId === localId);
  }, localId);
  expect(receipt.status).toBe('PENDING');
  expect((await getBundle()).sharedAssets.some((a: any) => a.id === receipt.id)).toBe(false);
  const reviewURL = `${server}/api/v1/assets/review/${receipt.id}`;
  const published = await request.post(reviewURL, { headers: { Authorization: authorization }, data: { status: 'PUBLISHED', reason: '隔离数据库测试发布' } });
  expect(published.status()).toBe(200);
  const otherContext = await browser.newContext();
  try {
    await otherContext.addInitScript(server => localStorage.setItem('jianghui-service-base', server), server);
    const other = await otherContext.newPage(); let calls = 0;
    other.on('request', req => { if (req.url().includes('/chat/completions')) calls++; });
    await other.goto('http://127.0.0.1:5173/');
    const exercise = await other.evaluate(async point => {
      const path = '/src/lib/local-llm.ts'; const llm = await import(/* @vite-ignore */ path);
      return llm.generateExercise({ knowledgePointIds: [point.id], difficulty: 1 }, 'standard', 'child');
    }, point);
    expect(exercise.content).toBe(content); expect(calls).toBe(0);
    const revoked = await request.post(reviewURL, { headers: { Authorization: authorization }, data: { status: 'REVOKED', reason: '结束测试并核撤回传播' } }); expect(revoked.status()).toBe(200);
    await other.reload();
    const next = await other.evaluate(async () => { const path = '/src/lib/assets.ts'; const m = await import(/* @vite-ignore */ path); return m.loadAssetBundle(); });
    expect(next.sharedAssets.some((a: any) => a.id === receipt.id)).toBe(false); expect(next.withdrawnIds).toContain(receipt.id);
  } finally {
    await request.post(reviewURL, { headers: { Authorization: authorization }, data: { status: 'REVOKED', reason: '清理隔离验收状态' } });
    await otherContext.close();
  }
});
