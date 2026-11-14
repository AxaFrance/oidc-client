import { expect, test } from '@playwright/test';

import { capture, signIn } from './helpers';

const configurations = [
  'config_classic',
  'config_without_discovery',
  'config_with_monitor_session',
  'config_without_refresh_token',
  'config_without_silent_login',
  'config_without_refresh_token_silent_login',
  'config_google',
  'config_with_hash',
  'config_show_access_token',
  'config_separate_oidc_access_token_domains',
  'config_with_dpop',
  'config_multi_tab_login',
];

for (const configuration of configurations) {
  test(`React named scenario ${configuration}`, async ({ page, context }) => {
    await page.addInitScript(
      name => sessionStorage.setItem('configurationName', name),
      configuration,
    );
    await page.goto('http://localhost:5173/multi-auth?worker=on&dpop=false');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await signIn(page);
    await expect(page.getByRole('button', { name: 'logout', exact: true })).toBeVisible();
    await expect(
      page.locator('.bg-success').getByText('"sub":"alice"', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveValue(configuration);
    await capture(page, 'react-' + configuration);
    if (configuration === 'config_with_monitor_session')
      await expect(page.locator('iframe[src*="checksession"]')).toBeAttached();
    if (configuration === 'config_multi_tab_login') {
      const second = await context.newPage();
      await second.addInitScript(
        name => sessionStorage.setItem('configurationName', name),
        configuration,
      );
      await second.goto('http://localhost:5173/multi-auth');
      await expect(second.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
      await second.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(second.getByRole('button', { name: 'logout', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'logout', exact: true })).toBeVisible();
      const firstPayload = await page
        .locator('.bg-info .card-text')
        .filter({ hasText: 'Access Token Payload:' })
        .first()
        .innerText();
      const secondPayload = await second
        .locator('.bg-info .card-text')
        .filter({ hasText: 'Access Token Payload:' })
        .first()
        .innerText();
      expect(JSON.parse(firstPayload.replace('Access Token Payload: ', '')).jti).not.toBe(
        JSON.parse(secondPayload.replace('Access Token Payload: ', '')).jti,
      );
      await capture(second, 'react-multi-tab-independent');
      await second.close();
    }
    await page.getByRole('button', { name: 'logout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });
}

for (const isDpop of [false, true]) {
  test(`React routes and userinfo with ${isDpop ? 'DPoP' : 'Bearer'}`, async ({ page }) => {
    await page.goto(`http://localhost:5173/profile-secure-component?worker=on&dpop=${isDpop}`);
    await signIn(page);
    await expect(
      page.locator('.bg-success').getByText('"sub":"alice"', { exact: false }),
    ).toBeVisible();
    for (const route of [
      'profile',
      'profile-secure-component',
      'profile-secure-hoc',
      'user-fetch-secure-hoc',
      'user-fetch-secure-hook',
      '',
    ]) {
      await page.goto('http://localhost:5173/' + route);
      if (route)
        await expect(
          page.locator('.bg-success').getByText('"sub":"alice"', { exact: false }),
        ).toBeVisible();
      await capture(page, `react-${isDpop ? 'dpop' : 'bearer'}-${route || 'home'}`);
    }
  });
}

for (const isWorker of [false, true]) {
  for (const configuration of ['config_classic', 'config_with_dpop']) {
    test(`React explicit silent login: ${configuration} / ${isWorker ? 'worker' : 'browser'}`, async ({
      page,
    }) => {
      await page.goto(
        `http://localhost:5173/multi-auth?worker=${isWorker ? 'on' : 'off'}&dpop=false`,
      );
      await page.getByRole('combobox').selectOption(configuration);
      await page.getByRole('button', { name: 'Silent Login', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('login_required');
      await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await signIn(page);
      await expect(page.getByRole('button', { name: 'logout', exact: true })).toBeVisible();
      await expect(page.getByTestId('selected-proof')).toContainText(
        configuration === 'config_with_dpop' ? 'DPoP' : 'Bearer',
      );
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const originalUrl = page.url();
      const authorization = page.waitForRequest(
        request => new URL(request.url()).pathname === '/connect/token',
      );
      await page.getByRole('button', { name: 'Silent Login', exact: true }).click();
      await authorization;
      await expect(
        page.locator('p').filter({ hasText: `oidc:${configuration}:silentLoginAsync_end` }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Silent Login', exact: true })).toBeEnabled();
      await expect(page.getByRole('alert')).not.toBeVisible();
      expect(page.url()).toBe(originalUrl);
      await page.getByRole('button', { name: 'Call both APIs' }).click();
      await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
      for (const api of ['orders', 'inventory']) {
        const result = JSON.parse(await page.getByTestId(`${api}-result`).innerText());
        expect(result.tokenType).toBe(configuration === 'config_with_dpop' ? 'DPoP' : 'Bearer');
        expect(result.subject).toBe('alice');
      }
      expect(errors).toEqual([]);
      await capture(
        page,
        `react-explicit-silent-${configuration}-${isWorker ? 'worker' : 'browser'}`,
      );
    });
  }
}
