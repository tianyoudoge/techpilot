import { test, expect } from '@playwright/test';

test('first release offers only DeepSeek and Bailian with one shared model', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '配置 API Key' }).click();
  const dialog = page.getByRole('dialog', { name: '配置模型' });
  await expect(dialog.getByRole('tab')).toHaveCount(2);
  await expect(dialog.getByRole('tab', { name: 'DeepSeek', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.locator('#model-input')).toHaveValue('deepseek-flash');
  await expect(dialog.locator('#asset-service-input')).toHaveCount(0);
  await dialog.locator('#api-key-input').fill('test-deepseek-key');
  await dialog.getByRole('tab', { name: '阿里云百炼', exact: true }).click();
  await expect(dialog.locator('#api-key-input')).toHaveValue('');
  await expect(dialog.locator('#model-input')).toHaveValue('qwen3-vl-plus');
  await dialog.locator('#api-key-input').fill('test-bailian-key');
  await expect(dialog.getByRole('link', { name: '获取 API Key' })).toHaveAttribute('href', 'https://help.aliyun.com/zh/model-studio/get-api-key');
  await dialog.getByRole('tab', { name: 'DeepSeek', exact: true }).click();
  await expect(dialog.locator('#api-key-input')).toHaveValue('test-deepseek-key');
  await dialog.getByRole('tab', { name: '阿里云百炼', exact: true }).click();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  const saved = await page.evaluate(() => ({ vision: localStorage.getItem('jianghui-local-model-vision'), text: localStorage.getItem('jianghui-local-model-text'), base: localStorage.getItem('jianghui-local-api-base'), key: localStorage.getItem('jianghui-local-api-key') }));
  expect(saved).toEqual({ vision: 'qwen3-vl-plus', text: 'qwen3-vl-plus', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', key: 'test-bailian-key' });
  await page.getByRole('button', { name: '本地模式已开启，点击修改' }).click();
  await expect(dialog.getByRole('tab', { name: '阿里云百炼', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: '/tmp/jianghui-provider-settings.png' });
});

test('a retired supplier key is never copied into the DeepSeek form', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('jianghui-local-api-base', 'https://api.siliconflow.cn/v1');
    localStorage.setItem('jianghui-local-api-key', 'old-provider-test-key');
  });
  await page.goto('/');
  await page.getByRole('button', { name: '本地模式已开启，点击修改' }).click();
  await expect(page.locator('#api-key-input')).toHaveValue('');
  await expect(page.locator('#model-input')).toHaveValue('deepseek-flash');
});
