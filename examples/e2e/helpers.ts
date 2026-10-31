import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, type Page } from '@playwright/test';

/** Saves credential-masked evidence, never browser traces or raw network responses. */
export async function capture(page: Page, name: string): Promise<void> {
  const directory = path.resolve(__dirname, 'screenshots');
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    mask: [page.locator('[data-sensitive]')],
    style: '[data-sensitive], [data-sensitive] * { visibility: hidden !important; }',
  });
}

/** Completes the fixture's synthetic, credential-free login. */
export async function signIn(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Sign in as Alice' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in as Alice' }).click();
}
