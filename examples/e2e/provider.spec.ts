import { expect, test } from '@playwright/test';

import { getDemoEnvironment, prepareDemoWorkerAsync, withDemoProvider } from '../shared/provider';

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

test('local configuration rejects unregistered loopback hostnames', () => {
  for (const hostname of ['127.0.0.1', '[::1]']) {
    expect(() =>
      getDemoEnvironment({
        isDevelopment: true,
        location: { hostname, search: '' },
        storage: storage(),
      }),
    ).toThrow('localhost');
  }
});

for (const state of ['active', 'waiting', 'installing', 'unrelated', 'failure']) {
  test(`browser mode handles ${state} registrations without removing unrelated workers`, async () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let removed = 0;
    let reloaded = 0;
    let inspected = 0;
    const demoWorker = {
      scriptURL: 'http://localhost:5173/OidcServiceWorker.js?provider=openiddict',
    };
    const registrations = [
      {
        active: state === 'active' || state === 'failure' ? demoWorker : null,
        waiting: state === 'waiting' ? demoWorker : null,
        installing: state === 'installing' ? demoWorker : null,
        unregister: async (): Promise<boolean> => {
          removed++;
          return state !== 'failure';
        },
      },
      ...['http://localhost:5173/pwa.js', 'http://localhost:5174/OidcServiceWorker.js'].map(
        (scriptURL: string) => ({
          active: { scriptURL },
          waiting: null,
          installing: null,
          unregister: async (): Promise<boolean> => {
            throw new Error('An unrelated worker must not be removed.');
          },
        }),
      ),
    ];
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          controller:
            state === 'active' || state === 'failure'
              ? demoWorker
              : { scriptURL: 'http://localhost:5173/pwa.js' },
          getRegistrations: async (): Promise<typeof registrations> => {
            inspected++;
            return registrations;
          },
        },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          origin: 'http://localhost:5173',
          reload: (): void => {
            reloaded++;
          },
        },
      },
    });
    try {
      expect(
        await prepareDemoWorkerAsync({ provider: 'duende', isWorker: false, isDpop: false }),
      ).toBe(true);
      expect(
        await prepareDemoWorkerAsync({ provider: 'openiddict', isWorker: true, isDpop: false }),
      ).toBe(true);
      expect(inspected).toBe(0);
      const startup = prepareDemoWorkerAsync({
        provider: 'openiddict',
        isWorker: false,
        isDpop: false,
      });
      if (state === 'failure')
        await expect(startup).rejects.toThrow('Unable to unregister the demo OIDC worker');
      else expect(await startup).toBe(state !== 'active');
      expect(inspected).toBe(1);
      expect(removed).toBe(state === 'unrelated' ? 0 : 1);
      expect(reloaded).toBe(state === 'active' ? 1 : 0);
    } finally {
      if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      else Reflect.deleteProperty(globalThis, 'navigator');
      if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
      else Reflect.deleteProperty(globalThis, 'window');
    }
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
