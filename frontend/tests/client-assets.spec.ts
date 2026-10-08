import { test, expect, type Page } from '@playwright/test';

const point = { id: 'MATH_01_ADD', name: '加法', chapterId: 'grade1_upper', grade: 1, description: '认识加法', definition: '求两部分的总数', explanation: '把两堆苹果放在一起数一数。', workedExample: '1+2=3，先数1个再加2个。', prerequisites: '[]', commonMistakes: '[]', sourceReferences: '[]', assetVersion: 'v1' };
const analysis = { questionText: '1+2=?', chapterId: point.chapterId, knowledgePointIds: [point.id], difficulty: 1, keyInsight: '把两部分合起来', fullSolution: '1+2=3', possibleStickingPoints: [{ id: 'sp_1', description: '不知道合起来是多少' }] };
const guide = { parentExplanation: '先数一数两部分，再合起来。', prerequisiteLessons: [], problemWalkthrough: '先数1个，再数2个，总共3个。', steps: [1, 2, 3].map(stepNo => ({ stepNo, title: `第${stepNo}步`, question: '一起数数？', ifCorrect: '继续数', ifWrong: '再拿苹果数一数' })) };
const generated = { content: '有2个苹果，再拿来2个，共几个？', answer: '4', solutionSteps: ['2加2等于4'], difficulty: 1, variationReason: '改变提问结构' };
const shared = { id: 'server-exercise', schemaVersion: 1, kind: 'standard', knowledgePointId: point.id, grade: 1, chapterId: point.chapterId, difficulty: 1, audience: 'child', generatorModel: 'reviewed', promptVersion: 'v1', content: generated, review: { correct: true, reason: '复核通过', independentAnswer: '4' } };

async function fixture(page: Page, options: { existing?: boolean; missingExample?: boolean; reviewPass?: boolean; failUpload?: boolean } = {}) {
  const bundle = { schemaVersion: 1, version: 'bundle-v1', taxonomy: [{ id: point.id, name: point.name, chapterId: point.chapterId, description: point.description }], assets: [{ ...point, workedExample: options.missingExample ? '' : point.workedExample }], sharedAssets: options.existing ? [shared] : [], withdrawnIds: [] as string[] };
  const state = { modelCalls: [] as any[], uploads: [] as any[], failUpload: options.failUpload ?? false, bundle };
  await page.addInitScript(() => {
    localStorage.setItem('jianghui-local-api-key', 'private-key');
    localStorage.setItem('jianghui-local-api-base', 'https://model.test/v1');
    localStorage.setItem('jianghui-local-model-text', 'test-model');
    localStorage.setItem('jianghui-local-model-vision', 'test-vision');
  });
  await page.route('**/api/v1/assets/bundle', route => route.fulfill({ json: { code: 0, data: state.bundle } }));
  await page.route('**/api/v1/assets/contributions', async route => {
    state.uploads.push(route.request().postDataJSON());
    if (state.failUpload) return route.fulfill({ status: 503, json: { code: 1005, message: '暂时离线' } });
    await route.fulfill({ json: { code: 0, data: { id: 'accepted-asset', status: 'PENDING' } } });
  });
  await page.route('**/api/v1/segments?**', route => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/model.test/v1/chat/completions', async route => {
    const body = route.request().postDataJSON(); state.modelCalls.push(body);
    const prompt = body.messages[0].content;
    let output: any;
    if (Array.isArray(prompt)) output = analysis;
    else if (prompt.includes('复核员')) output = { correct: options.reviewPass !== false, reason: '独立验算', independentAnswer: '4' };
    else if (prompt.startsWith('生成可复用的家长讲法模板')) output = { explanation: '把两部分合起来，用苹果数数。', steps: guide.steps };
    else if (prompt.includes('知识资产') && !prompt.includes('context')) output = { definition: '错误的替换定义', explanation: '错误的替换解释', workedExample: '有1个苹果再拿来2个，总共3个。1+2=3。' };
    else if (prompt.includes('复核员')) output = { correct: options.reviewPass !== false, reason: '独立验算', independentAnswer: '4' };
    else if (prompt.includes('讲稿')) output = guide;
    else output = generated;
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify(output) } }], usage: { total_tokens: 100 } } });
  });
  await page.goto('/');
  return state;
}
async function clientCall(page: Page, task: string, payload: any = {}) {
  return page.evaluate(async ({ task, payload }) => {
    const llmPath = '/src/lib/local-llm.ts'; const assetsPath = '/src/lib/assets.ts'; const storePath = '/src/lib/client-store.ts';
    const llm = await import(/* @vite-ignore */ llmPath); const assets = await import(/* @vite-ignore */ assetsPath); const store = await import(/* @vite-ignore */ storePath);
    if (task === 'exercise') return llm.generateExercise(payload.analysis, payload.kind ?? 'standard', payload.audience ?? 'child', payload.previous);
    if (task === 'guide') return llm.generateGuide(payload.analysis, 'standard');
    if (task === 'save') { await llm.saveLocalSession(payload); return true; }
    if (task === 'read') return llm.readLocalSession(payload.id);
    if (task === 'outbox') { await assets.flushAssetOutbox(true); return store.all('outbox'); }
    if (task === 'bundle') return assets.loadAssetBundle(true);
    if (task === 'generate-records') return store.all('generated');
  }, { task, payload });
}

test('existing server exercise bypasses LLM and uploads', async ({ page }) => {
  const state = await fixture(page, { existing: true });
  const ex = await clientCall(page, 'exercise', { analysis });
  expect(ex.content).toBe(generated.content); expect(state.modelCalls).toHaveLength(0); expect(state.uploads).toHaveLength(0);
});
test('missing exercise generates, independently reviews, persists and uploads only reusable fields', async ({ page }) => {
  const state = await fixture(page);
  const ex = await clientCall(page, 'exercise', { analysis });
  expect(ex.answer).toBe('4'); await clientCall(page, 'outbox');
  expect(state.modelCalls).toHaveLength(2); expect(state.uploads).toHaveLength(1);
  expect(state.uploads[0].kind).toBe('standard'); expect(state.uploads[0].review.correct).toBe(true);
  expect(JSON.stringify(state.uploads)).not.toMatch(/private-key|imageDataUrl|questionText|fullSolution/);
  const cached = await clientCall(page, 'exercise', { analysis });
  expect(cached.content).toBe(ex.content); expect(state.modelCalls).toHaveLength(2);
  await page.reload(); await clientCall(page, 'exercise', { analysis }); expect(state.modelCalls).toHaveLength(2);
});
test('partial knowledge generates only missing example and preserves existing definition/explanation', async ({ page }) => {
  const state = await fixture(page, { missingExample: true });
  const result = await clientCall(page, 'guide', { analysis }); await clientCall(page, 'outbox');
  expect(result.context.knowledge[0].definition).toBe(point.definition);
  expect(result.context.knowledge[0].explanation).toBe(point.explanation);
  expect(result.context.knowledge[0].workedExample).toContain('苹果');
  expect(state.modelCalls).toHaveLength(5); expect(state.uploads).toHaveLength(2); expect(state.uploads[0].kind).toBe('knowledge');
});
test('failed independent review leaves no usable asset or upload', async ({ page }) => {
  const state = await fixture(page, { reviewPass: false });
  await expect(clientCall(page, 'exercise', { analysis })).rejects.toThrow('复核未通过');
  expect(await clientCall(page, 'generate-records')).toHaveLength(0); expect(state.uploads).toHaveLength(0);
});
test('failed upload survives restart and retry without generating again', async ({ page }) => {
  const state = await fixture(page, { failUpload: true });
  await clientCall(page, 'exercise', { analysis }); const queue = await clientCall(page, 'outbox'); expect(queue).toHaveLength(1);
  await page.reload(); state.failUpload = false;
  expect(await clientCall(page, 'outbox')).toHaveLength(0);
  await clientCall(page, 'exercise', { analysis }); expect(state.modelCalls).toHaveLength(2);
});
test('published asset withdrawal prevents reuse of local submitted copy', async ({ page }) => {
  const state = await fixture(page);
  await clientCall(page, 'exercise', { analysis }); await clientCall(page, 'outbox');
  state.bundle.withdrawnIds = ['accepted-asset']; state.bundle.version = 'bundle-v2';
  const bundle = await clientCall(page, 'bundle'); expect(bundle.sharedAssets).toHaveLength(0);
});
test('exercise matching distinguishes difficulty, audience and excludes previous content', async ({ page }) => {
  const state = await fixture(page, { existing: true });
  await clientCall(page, 'exercise', { analysis: { ...analysis, difficulty: 2 }, audience: 'parent' });
  expect(state.modelCalls).toHaveLength(2);
  expect(state.uploads.length).toBeLessThanOrEqual(1);
});
test('multiple local sessions survive reload and appear in history without login', async ({ page }) => {
  await fixture(page);
  for (const id of [100, 101]) await clientCall(page, 'save', { id, local: true, analysis, imageDataUrl: '', createdAt: new Date().toISOString() });
  await page.goto('/history'); await expect(page.locator('.history-row')).toHaveCount(2);
  await page.locator('.history-row').first().click(); await expect(page).toHaveURL(/session\/local:10[01]\/insight/);
  await expect(page.getByRole('heading', { name: '这题，关键在哪里？' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: '这题，关键在哪里？' })).toBeVisible();
  expect(await clientCall(page, 'read', { id: 'local:100' })).not.toBeNull();
});
test('local teaching main flow generates guide and verifies using server asset without login or teaching API', async ({ page }) => {
  const state = await fixture(page, { existing: true });
  const serverCalls: string[] = [];
  page.on('request', req => { if (/\/api\/v1\/(sessions|questions|history)/.test(req.url())) serverCalls.push(req.url()); });
  await clientCall(page, 'save', { id: 123, local: true, analysis, imageDataUrl: '', createdAt: new Date().toISOString() });
  await page.goto('/session/local:123/insight');
  await page.getByRole('button', { name: '题目没问题，看看怎么讲' }).click();
  await expect(page.getByRole('heading', { name: '知识点与解法' })).toBeVisible();
  await expect(page.locator('.mobile-flow-actions')).toBeInViewport();
  await clientCall(page, 'save', { ...(await clientCall(page, 'read', { id: 'local:123' })), teachingCompleted: true });
  await page.goto('/session/local:123/exercise'); await expect(page.getByRole('heading', { name: '试一道，看看会没会。' })).toBeVisible();
  await expect(page.locator('.exercise-stage')).toContainText(generated.content);
  await page.getByRole('button', { name: '做完了，对照答案' }).click();
  await page.getByRole('button', { name: '这次先跳过' }).click(); await expect(page.locator('.result-stage')).toBeVisible();
  expect(serverCalls).toHaveLength(0); expect(state.modelCalls).toHaveLength(3);
});
test('changing sticking point clears previous round but retains original question', async ({ page }) => {
  await fixture(page);
  await clientCall(page, 'save', { id: 124, local: true, analysis, imageDataUrl: '', createdAt: new Date().toISOString(), guide: { ...guide, method: 'standard', context: { knowledge: [], prerequisites: [], segments: [] } }, teachingCompleted: true, stepsCompleted: 3, verificationResult: 'CORRECT', masteryLevel: 'BASIC', status: 'TEACHING', standardExercise: { id: -1, ...generated } });
  await page.goto('/session/local:124/insight');
  await page.getByRole('button', { name: /不知道合起来是多少/ }).click();
  await expect.poll(async () => (await clientCall(page, 'read', { id: 'local:124' })).stickingPointId).toBe('sp_1');
  const saved = await clientCall(page, 'read', { id: 'local:124' });
  expect(saved.verificationResult).toBe(''); expect(saved.stepsCompleted).toBe(0); expect(saved.standardExercise).toBeUndefined(); expect(saved.analysis.questionText).toBe(analysis.questionText);
});

test('cached asset bundle remains usable when asset service is unavailable', async ({ page }) => {
  await fixture(page, { existing: true });
  await clientCall(page, 'bundle');
  await page.route('**/api/v1/assets/bundle', route => route.abort());
  await page.reload();
  expect((await clientCall(page, 'exercise', { analysis })).answer).toBe('4');
});

test('withdrawing server asset removes it from next snapshot', async ({ page }) => {
  const state = await fixture(page, { existing: true });
  expect((await clientCall(page, 'bundle')).sharedAssets).toHaveLength(1);
  state.bundle.sharedAssets = []; state.bundle.version = 'bundle-v2'; state.bundle.withdrawnIds = [shared.id];
  expect((await clientCall(page, 'bundle')).sharedAssets).toHaveLength(0);
});


test('startup checks the asset version once, reuses it past 60 seconds and revalidates on reopen', async ({ page, browserName }) => {
  if (browserName === 'webkit') await page.addInitScript(() => {
    // Playwright WebKit cannot route.fulfill a 304; reproduce its fetch response.
    const fetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await fetch(...args);
      return response.headers.get('x-test-not-modified') ? new Response(null, { status: 304 }) : response;
    };
  });
  const headers: (string | undefined)[] = [];
  let version = 'bundle-v1';
  await fixture(page, { existing: true });
  await page.evaluate(async () => {
    const path = '/src/lib/assets.ts'; const { loadAssetBundle } = await import(/* @vite-ignore */ path);
    await loadAssetBundle();
  });
  // Install before a fresh open so the startup request is observable.
  await page.route('**/api/v1/assets/bundle', route => {
    const tag = route.request().headers()['if-none-match'];
    headers.push(tag);
    if (tag === `"${version}"`) return route.fulfill(browserName === 'webkit' ? { status: 200, headers: { 'x-test-not-modified': '1' }, body: '' } : { status: 304 });
    return route.fulfill({ json: { code: 0, data: { schemaVersion: 1, version, taxonomy: [point], assets: [point], sharedAssets: [shared], withdrawnIds: [] } } });
  });
  await page.reload();
  await expect.poll(() => headers.length).toBe(1);
  const readAssets = () => page.evaluate(async () => {
    const path = '/src/lib/assets.ts'; const { loadAssetBundle } = await import(/* @vite-ignore */ path);
    const results = await Promise.all([loadAssetBundle(), loadAssetBundle(), loadAssetBundle()]);
    return results[0].version;
  });
  expect(await readAssets()).toBe('bundle-v1');
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 120000; });
  expect(await readAssets()).toBe('bundle-v1');
  expect(headers).toEqual(['"bundle-v1"']);
  await page.reload();
  expect(await readAssets()).toBe('bundle-v1');
  expect(headers).toEqual(['"bundle-v1"', '"bundle-v1"']);
  version = 'bundle-v2';
  await page.reload();
  expect(await readAssets()).toBe('bundle-v2');
  expect(headers).toHaveLength(3);
  expect(await readAssets()).toBe('bundle-v2');
  expect(headers).toHaveLength(3);
});
