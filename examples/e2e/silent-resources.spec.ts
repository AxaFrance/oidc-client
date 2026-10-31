import { expect, test } from '@playwright/test';

import { capture, signIn } from './helpers';

for (const isWorker of [false, true]) {
  for (const isDpop of [false, true]) {
    test(`Resource authorization without refresh tokens: ${isWorker ? 'worker' : 'browser'} / ${isDpop ? 'DPoP' : 'Bearer'}`, async ({
      page,
    }) => {
      await page.addInitScript(() =>
        sessionStorage.setItem('configurationName', 'config_without_refresh_token'),
      );
      await page.goto(
        `http://localhost:5173/multi-auth?worker=${isWorker ? 'on' : 'off'}&dpop=${isDpop}`,
      );
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await signIn(page);
      await page.getByRole('button', { name: 'Call both APIs' }).click();
      await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
      const original = JSON.parse(await page.getByTestId('orders-result').innerText());
      await page.getByRole('button', { name: 'Renew Orders' }).click();
      await expect(page.getByTestId('resource-status')).toContainText('Orders renewed');
      expect(JSON.parse(await page.getByTestId('orders-result').innerText()).tokenId).not.toBe(
        original.tokenId,
      );
      await capture(
        page,
        `react-silent-resources-${isWorker ? 'worker' : 'browser'}-${isDpop ? 'dpop' : 'bearer'}`,
      );
    });
  }
}
