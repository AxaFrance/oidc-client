import { expect, test } from '@playwright/test';

import { capture, signIn } from './helpers';

test('DPoP API rejects replay, Bearer downgrade, missing proof and wrong audience', async ({
  page,
  request,
}) => {
  let headers: Record<string, string> = {};
  page.on('request', incoming => {
    if (incoming.url().startsWith('http://localhost:7002/api/orders')) headers = incoming.headers();
  });
  await page.goto('http://localhost:5173/resources?worker=off&dpop=true');
  await signIn(page);
  await page.getByRole('button', { name: 'Call both APIs' }).click();
  await expect(page.getByTestId('resource-status')).toContainText('Both APIs accepted');
  expect(headers.authorization).toMatch(/^DPoP /);
  expect(headers.dpop).toBeTruthy();
  const replay = await request.get('http://localhost:7002/api/orders?limit=2', { headers });
  expect(replay.status()).toBe(401);
  expect((await replay.json()).error_description).toContain('already used');
  const bearer = await request.get('http://localhost:7002/api/orders', {
    headers: { authorization: 'Bearer ' + headers.authorization.slice(5) },
  });
  expect(bearer.status()).toBe(401);
  const missing = await request.get('http://localhost:7002/api/orders', {
    headers: { authorization: headers.authorization },
  });
  expect(missing.status()).toBe(401);
  const wrongAudience = await request.get('http://localhost:7003/api/inventory', { headers });
  expect(wrongAudience.status()).toBe(403);
  await capture(page, 'react-dpop-api-rejections');
});
