import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

for (const storage of ['sessionStorage', 'localStorage'] as const) {
  for (const rejected of [false, true]) {
    test(`${storage}: expired restoration waits for ${rejected ? 'rejected' : 'successful'} renewal`, async ({
      page,
    }) => {
      // Run the same demo against each browser storage implementation without changing its configuration API.
      if (storage === 'localStorage') {
        await page.addInitScript(() => {
          Object.defineProperty(window, 'sessionStorage', { value: window.localStorage });
        });
      }
      await page.goto('http://localhost:5174/?worker=off&dpop=false');
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await signIn(page);
      const authenticated = page.getByRole('heading', { name: 'Login demo Authenticated' });
      await expect(authenticated).toBeVisible();
      await page.evaluate(storageName => {
        const store = window[storageName];
        const session = JSON.parse(store.getItem('oidc.default')!);
        session.tokens.expiresAt = 1;
        store.setItem('oidc.default', JSON.stringify(session));
      }, storage);

      let release: () => void;
      const released = new Promise<void>(resolve => {
        release = resolve;
      });
      let refreshRequests = 0;
      await page.route('http://localhost:7001/connect/token', async route => {
        if (
          new URLSearchParams(route.request().postData() ?? '').get('grant_type') !==
          'refresh_token'
        ) {
          await route.continue();
          return;
        }
        refreshRequests++;
        await released;
        if (rejected) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'invalid_grant' }),
          });
        } else {
          await route.continue();
        }
      });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.reload({ waitUntil: 'domcontentloaded' });
      try {
        await expect.poll(() => refreshRequests).toBe(1);
        await expect(authenticated).not.toBeVisible();
      } finally {
        release();
      }
      if (rejected) {
        await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
        await expect(authenticated).not.toBeVisible();
      } else {
        await expect(authenticated).toBeVisible();
        const expiresAt = await page.evaluate(
          storageName => JSON.parse(window[storageName].getItem('oidc.default')!).tokens.expiresAt,
          storage,
        );
        expect(expiresAt).toBeGreaterThan(Date.now() / 1000);
      }
      expect(errors).toEqual([]);
    });
  }
}
