import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

test('valid-token timer ticks do not repeatedly check worker scripts for updates', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = ServiceWorkerRegistration.prototype.update;
    (window as unknown as { workerUpdateChecks: number }).workerUpdateChecks = 0;
    ServiceWorkerRegistration.prototype.update = function () {
      (window as unknown as { workerUpdateChecks: number }).workerUpdateChecks++;
      return original.call(this);
    };
  });
  await page.goto('http://localhost:5173/multi-auth?worker=on&dpop=false');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await signIn(page);
  await expect(page.getByRole('button', { name: 'logout', exact: true })).toBeVisible();
  await expect(page.locator('p').filter({ hasText: 'token_timer' })).toBeVisible();
  const checks = () =>
    page.evaluate(() => (window as unknown as { workerUpdateChecks: number }).workerUpdateChecks);
  expect(await checks()).toBe(1);
  await page.waitForTimeout(4000);
  expect(await checks()).toBe(1);
  await page.getByRole('button', { name: 'Call both APIs' }).click();
  await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
  expect(await checks()).toBe(1);
});
