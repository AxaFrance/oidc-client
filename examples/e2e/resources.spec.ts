import { expect, test } from '@playwright/test';

import { capture, signIn } from './helpers';

for (const demo of ['react', 'native'] as const) {
  for (const isDpop of [false, true]) {
    for (const isWorker of [false, true]) {
      const mode = `${demo}-${isDpop ? 'dpop' : 'bearer'}-${isWorker ? 'worker' : 'browser'}`;
      test(`${mode}: isolated APIs, rotation, automatic renewal, clearing and explicit errors`, async ({
        page,
      }) => {
        const port = demo === 'react' ? 5173 : 5174;
        const route = demo === 'react' ? '/resources' : '/';
        const tokenRequests: string[][] = [];
        page.on('request', request => {
          if (request.url() === 'http://localhost:7001/connect/token')
            tokenRequests.push(new URLSearchParams(request.postData() ?? '').getAll('resource'));
        });
        await page.goto(
          `http://localhost:${port}${route}?dpop=${isDpop}&worker=${isWorker ? 'on' : 'off'}`,
        );
        if (demo === 'native')
          await page.getByRole('button', { name: 'Login', exact: true }).click();
        await signIn(page);
        await expect(
          page.getByRole('heading', { name: 'RFC 8707 resource playground' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Call both APIs' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
        const orders = JSON.parse(await page.getByTestId('orders-result').innerText());
        const inventory = JSON.parse(await page.getByTestId('inventory-result').innerText());
        expect(orders.resource).toBe('http://localhost:7002/');
        expect(inventory.resource).toBe('http://localhost:7003/');
        expect(orders.tokenId).not.toBe(inventory.tokenId);
        expect(orders.tokenType).toBe(isDpop ? 'DPoP' : 'Bearer');
        expect(inventory.tokenType).toBe(orders.tokenType);
        expect(orders.subject).toBe('alice');
        expect(orders.clientId).toBe('interactive.public.short');
        await capture(page, mode + '-apis');
        await page.getByRole('button', { name: 'Renew Orders' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('Orders renewed');
        const renewed = JSON.parse(await page.getByTestId('orders-result').innerText());
        expect(renewed.tokenId).not.toBe(orders.tokenId);
        expect(JSON.parse(await page.getByTestId('inventory-result').innerText()).tokenId).toBe(
          inventory.tokenId,
        );
        await capture(page, mode + '-renewal');
        // Fifteen-second tokens must renew using the shared rotated grant before both APIs are called again.
        await page.waitForTimeout(16_000);
        await page.getByRole('button', { name: 'Call both APIs' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
        expect(JSON.parse(await page.getByTestId('orders-result').innerText()).tokenId).not.toBe(
          renewed.tokenId,
        );
        await page.getByRole('button', { name: 'Clear Orders' }).click();
        await expect(page.getByTestId('orders-result')).toContainText('No acquired resource token');
        await capture(page, mode + '-clear');
        await page.getByRole('button', { name: 'Call both APIs' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
        let hasWrongDispatch = false;
        const listener = (request: { url(): string }): void => {
          if (request.url().includes('/api/inventory')) hasWrongDispatch = true;
        };
        page.on('request', listener);
        await page.getByRole('button', { name: 'Test wrong destination' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('INVALID_RESOURCE');
        page.off('request', listener);
        expect(hasWrongDispatch).toBe(false);
        await capture(page, mode + '-wrong-destination');
        await page.getByRole('button', { name: 'Test provider error' }).click();
        await expect(page.getByTestId('resource-status')).toContainText('invalid_target');
        await capture(page, mode + '-provider-error');
        expect(tokenRequests).toContainEqual(['http://localhost:7002/']);
        expect(tokenRequests).toContainEqual(['http://localhost:7003/']);
      });
    }
  }
}
