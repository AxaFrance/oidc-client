import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

for (const demo of ['react', 'native'] as const) {
  for (const isDpop of [false, true]) {
    test(`${demo} switches from worker to browser with ${isDpop ? 'DPoP' : 'Bearer'} and back`, async ({
      page,
    }) => {
      const origin = demo === 'react' ? 'http://localhost:5173' : 'http://localhost:5174';
      const route = demo === 'react' ? '/resources' : '/';
      for (const [index, isWorker] of [true, false, true].entries()) {
        await page.goto(`${origin}${route}?worker=${isWorker ? 'on' : 'off'}&dpop=${isDpop}`);
        if (demo === 'native')
          await page.getByRole('button', { name: 'Login', exact: true }).click();
        if (index === 0) await signIn(page);
        await expect(page.getByRole('button', { name: 'Call both APIs' })).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
          .toBe(isWorker);
        await page.getByRole('button', { name: 'Call both APIs' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
        const orders = JSON.parse(await page.getByTestId('orders-result').innerText());
        const inventory = JSON.parse(await page.getByTestId('inventory-result').innerText());
        expect(orders.tokenType).toBe(isDpop ? 'DPoP' : 'Bearer');
        expect(inventory.tokenType).toBe(orders.tokenType);
      }
    });
  }
}
