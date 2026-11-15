import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

for (const isWorker of [false, true]) {
  test(`React manual renewal handles invalid_grant without a null-token crash (${isWorker ? 'worker' : 'browser'})`, async ({
    page,
    context,
  }) => {
    await page.goto(`http://localhost:5173/?worker=${isWorker ? 'on' : 'off'}&dpop=false`);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await signIn(page);
    await expect(
      page.locator('.bg-success').getByText('"sub":"alice"', { exact: false }),
    ).toBeVisible();
    await page.goto('http://localhost:5173/');
    const renew = page.getByRole('button', { name: 'renew tokens', exact: true });
    await expect(renew).toBeVisible();

    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let refreshRequests = 0;
    let renewalResolved = false;
    page.on('console', message => {
      if (message.text().startsWith('renewTokens result')) renewalResolved = true;
    });
    await context.route('http://localhost:7001/connect/token', async route => {
      if (
        new URLSearchParams(route.request().postData() ?? '').get('grant_type') !== 'refresh_token'
      ) {
        await route.continue();
        return;
      }
      refreshRequests++;
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant' }),
      });
    });
    await renew.click();
    await expect(page.getByRole('heading', { name: 'Session timed out' })).toBeVisible();
    await expect.poll(() => renewalResolved).toBe(true);
    expect(refreshRequests).toBe(1);
    expect(errors).toEqual([]);
  });
}
