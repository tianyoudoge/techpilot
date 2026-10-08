import { test, expect } from '@playwright/test';

test('DeepSeek structured requests reserve their output budget for the answer', async ({ page }) => {
  await page.route('https://api.deepseek.com/chat/completions', async route => {
    const input = route.request().postDataJSON();
    // Reproduce the real phone response: an enabled thinking pass consumes the
    // whole short budget and leaves message.content empty.
    const disabled = input.thinking?.type === 'disabled';
    await route.fulfill({ json: {
      choices: [{ finish_reason: disabled ? 'stop' : 'length', message: {
        content: disabled ? '{"answer":"8"}' : '', reasoning_content: disabled ? '' : 'still thinking',
      } }],
      usage: { completion_tokens: disabled ? 8 : 2000, completion_tokens_details: { reasoning_tokens: disabled ? 0 : 2000 } },
    } });
  });
  await page.goto('/');
  const content = await page.evaluate(async () => {
    const path = '/src/lib/model/client.ts'; const { llmCall } = await import(/* @vite-ignore */ path);
    return llmCall({ apiKey: 'fixture-key', baseUrl: 'https://api.deepseek.com', modelText: 'deepseek-flash', modelVision: 'deepseek-flash' }, [{ role: 'user', content: 'Return JSON with the answer.' }], 'deepseek-flash', 2000);
  });
  expect(JSON.parse(content).answer).toBe('8');
});
