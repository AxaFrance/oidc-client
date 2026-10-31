import { expect, test } from '@playwright/test';

import { getDemoEnvironment, withDemoProvider } from '../shared/provider';

function storage(value: string | null = null): Storage {
  return {
    length: value === null ? 0 : 1,
    clear: (): void => {
      value = null;
    },
    key: (): string => 'oidc-demo-options',
    getItem: (): string | null => value,
    setItem: (_key: string, next: string): void => {
      value = next;
    },
    removeItem: (): void => {
      value = null;
    },
  };
}

test('production keeps the Duende configuration unchanged', () => {
  const environment = getDemoEnvironment({
    isDevelopment: false,
    location: { hostname: 'online.example', search: '' },
    storage: storage(),
  });
  const configuration = {
    authority: 'https://demo.duendesoftware.com',
    client_id: 'public',
    scope: 'openid',
    redirect_uri: 'https://online.example/callback',
  };
  expect(environment.provider).toBe('duende');
  expect(withDemoProvider(configuration, environment)).toBe(configuration);
});

test('development retains explicit modes across callbacks and supports discovery-less endpoints', () => {
  const saved = storage();
  const environment = getDemoEnvironment({
    isDevelopment: true,
    location: { hostname: 'localhost', search: '?worker=off&dpop=true' },
    storage: saved,
  });
  expect(
    getDemoEnvironment({
      isDevelopment: true,
      location: { hostname: 'localhost', search: '' },
      storage: saved,
    }),
  ).toEqual(environment);
  const configuration = withDemoProvider(
    {
      authority: 'https://demo.duendesoftware.com',
      client_id: 'public',
      scope: 'openid api',
      redirect_uri: 'http://localhost:5173/callback',
      authority_configuration: {
        issuer: 'https://demo.duendesoftware.com',
        authorization_endpoint: 'https://demo.duendesoftware.com/authorize',
        token_endpoint: 'https://demo.duendesoftware.com/token',
      },
    },
    environment,
  );
  expect(configuration.authority_configuration?.token_endpoint).toBe(
    'http://localhost:7001/connect/token',
  );
  expect(configuration.service_worker_relative_url).toBeUndefined();
  expect(configuration.resource).toHaveLength(2);
});

for (const value of ['null', '[]', '{"isWorker":"yes"}', '{']) {
  test(`invalid saved modes reject explicitly: ${value}`, () => {
    expect(() =>
      getDemoEnvironment({
        isDevelopment: true,
        location: { hostname: 'localhost', search: '' },
        storage: storage(value),
      }),
    ).toThrow();
  });
}

test('invalid provider, origin, and query modes reject explicitly', () => {
  for (const options of [
    { provider: 'unknown', hostname: 'localhost', search: '' },
    { provider: 'openiddict', hostname: 'online.example', search: '' },
    { provider: 'openiddict', hostname: 'localhost', search: '?dpop=yes' },
    { provider: 'openiddict', hostname: 'localhost', search: '?worker=yes' },
  ])
    expect(() =>
      getDemoEnvironment({
        isDevelopment: true,
        provider: options.provider,
        location: options,
        storage: storage(),
      }),
    ).toThrow();
});
