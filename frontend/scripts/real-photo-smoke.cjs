// Explicit real-service smoke run: no API interception. Creates a regression account and session.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.UI_REAL_OUTPUT ? path.resolve(process.env.UI_REAL_OUTPUT) : path.resolve(__dirname, '../../docs/reviews/real-photo-flow');
const origin = process.env.UI_REAL_URL || 'http://127.0.0.1:8080';
const report = { origin, startedAt: new Date().toISOString(), steps: [], errors: [], question: '已知二次函数 y=(x−2)²−1，求它在 1≤x≤5 时的最大值和最小值，并说明理由。', expected: '最小值 −1（x=2），最大值 8（x=5）。' };
function log(step, details) { report.steps.push({ step, details }); console.log(step, typeof details === 'string' ? details : JSON.stringify(details || {})); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const shots = async name => { await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true, animations: 'disabled' }); };
  try {
    await page.setContent(`<html lang="zh-CN"><meta charset="utf-8"><style>body{margin:0;background:white;color:#151515;font-family:'PingFang SC',sans-serif}.paper{width:800px;padding:70px;box-sizing:border-box}small{font-size:20px;color:#555}h1{font-size:30px;margin:25px 0 45px}p{font-size:29px;line-height:2}.formula{font-family:Georgia;font-size:38px;padding:20px 0}footer{margin-top:75px;font-size:18px;color:#777}</style><div class="paper"><small>初中数学 · 自编回归测试题</small><h1>二次函数在指定范围内的最值</h1><p>已知二次函数</p><div class="formula">y = (x − 2)² − 1</div><p>求它在 1 ≤ x ≤ 5 时的最大值和最小值，并说明理由。</p><footer>只含题目，不包含参考答案</footer></div></html>`);
    await page.locator('.paper').screenshot({ path: path.join(out, 'question.png') });
    log('题目图片生成');
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(origin);
    await expect(page.getByRole('heading', { name: /今天，讲会一道题。|接着上次，继续讲会。/ })).toBeVisible();
    await shots('01-initial');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.locator('#phone').fill('13900001004');
    await page.getByRole('button', { name: '获取验证码' }).click();
    await page.locator('#code').fill('888888');
    await page.getByRole('button', { name: '登录并继续', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    log('真实登录通过', '使用项目内测短信验证码；专用回归账号 13900001004');
    if (process.env.UI_REAL_SESSION) {
      report.sessionId = Number(process.env.UI_REAL_SESSION);
      await page.goto(origin + '/session/' + report.sessionId + '/insight');
      log('恢复已真实上传的回归会话', { sessionId: report.sessionId });
    } else {
    await page.getByLabel('从相册选择题目').setInputFiles(path.join(out, 'question.png'));
    await expect(page.getByRole('heading', { name: '把题目框出来' })).toBeVisible();
    await shots('02-crop');
    const analyzing = page.waitForResponse(r => r.url().endsWith('/api/v1/questions/analyze'), { timeout: 120000 });
    await page.getByRole('button', { name: '就看这一题' }).click();
    const response = await analyzing;
    const payload = await response.json();
    log('真实图片上传与分析响应', { httpStatus: response.status(), code: payload.code, message: payload.message });
    if (!response.ok() || payload.code !== 0) {
      await expect(page.getByRole('alert')).toBeVisible();
      await shots('03-analysis-error');
      throw new Error('真实分析接口未成功：' + payload.message);
    }
    report.sessionId = payload.data.sessionId;
    }
    await expect(page.getByRole('heading', { name: '这题，关键在哪里？' })).toBeVisible({ timeout: 120000 });
    await page.getByText('对照原照片', { exact: true }).click();
    const original = page.getByAltText('上传的原题照片');
    await expect(original).toBeVisible();
    await expect.poll(() => original.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    log('本地原图回显通过');
    await page.reload();
    await expect(page.getByRole('heading', { name: '这题，关键在哪里？' })).toBeVisible();
    await page.getByText('对照原照片', { exact: true }).click();
    await expect(page.getByAltText('上传的原题照片')).toBeVisible();
    await expect.poll(() => page.getByAltText('上传的原题照片').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    log('刷新后原图回显通过');
    await shots('03-insight');
    await page.getByRole('button', { name: '题目没问题，看看怎么讲' }).click();
    await expect(page.getByRole('heading', { name: '知识点与解法' })).toBeVisible({ timeout: 120000 });
    await expect(page.locator('.lesson-columns')).toBeVisible();
    await shots('04-lesson');
    log('真实讲稿与视频推荐显示通过');
    const progress = await page.evaluate(async id => {
      const r = await fetch('/api/v1/sessions/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('jianghui-token') } });
      return (await r.json()).data;
    }, report.sessionId);
    if (progress.teachingCompleted) {
      await page.goto(origin + '/session/' + report.sessionId + '/exercise');
    } else {
      await page.getByRole('button', { name: '我明白了，开始给孩子讲' }).click();
      await expect(page.locator('.teaching-card')).toBeVisible();
      for (let i = progress.stepsCompleted; i < progress.guide.steps.length; i++) {
        await page.getByRole('button', { name: '自己说出来了', exact: true }).click();
        await page.waitForLoadState('networkidle');
      }
    }
    await expect(page.getByRole('heading', { name: '试一道，看看会没会。' })).toBeVisible({ timeout: 120000 });
    for (let attempt = 0; attempt < 3 && !await page.locator('.exercise-paper').isVisible(); attempt++) {
      const retry = page.getByRole('button', { name: '重新准备一道题', exact: true });
      await Promise.race([page.locator('.exercise-paper').waitFor({ state: 'visible', timeout: 90000 }), retry.waitFor({ state: 'visible', timeout: 90000 })]);
      if (await retry.isVisible()) {
        log('验证题未通过复核或加载，使用界面重试', { attempt: attempt + 1 });
        await retry.click();
        await page.waitForLoadState('networkidle');
      }
    }
    await expect(page.locator('.exercise-paper')).toBeVisible({ timeout: 10000 });
    await shots('05-exercise');
    await page.getByRole('button', { name: '做完了，对照答案' }).click();
    report.standardText = await page.locator('.exercise-stage').innerText();
    await page.getByRole('button', { name: '独立做对了' }).click();
    await expect(page.locator('.result-stage')).toBeVisible();
    await page.getByRole('button', { name: '再做一道变式，看看理解稳不稳' }).click();
    await expect(page.getByRole('heading', { name: '换个条件，再试试。' })).toBeVisible({ timeout: 120000 });
    await page.getByRole('button', { name: '做完了，对照答案' }).click();
    report.variationText = await page.locator('.exercise-stage').innerText();
    await page.getByRole('button', { name: '独立做对了' }).click();
    await expect(page.locator('.result-stage')).toBeVisible();
    await shots('06-result');
    const detail = await page.evaluate(async id => {
      const r = await fetch('/api/v1/sessions/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('jianghui-token') } });
      return (await r.json()).data;
    }, report.sessionId);
    report.questionText = detail.question.questionText;
    report.fullSolution = detail.question.fullSolution;
    report.guide = detail.guide;
    report.imageURL = detail.question.imageUrl;
    report.masteryLevel = detail.masteryLevel;
    await page.goto(origin + '/');
    await expect(page.locator('.home-page.has-records')).toBeVisible();
    await shots('07-returning');
    report.result = 'passed';
    log('真实全流程通过', '步骤与作答结果为自动化模拟反馈，不代表真实学习效果');
  } catch (error) {
    report.result = 'blocked'; report.failure = error.message;
    console.log('回归停止：' + error.message);
    await shots('last-state').catch(() => {});
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
