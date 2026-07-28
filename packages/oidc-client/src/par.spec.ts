import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ILOidcLocation } from './location';
import { defaultLoginAsync } from './login';
import { OidcAuthorizationServiceConfiguration } from './oidc';
import { PushedAuthorizationRequestErrorCode } from './pushedAuthorizationRequestError';
import { Fetch, OidcConfiguration } from './types';

const makeStorage = (): Storage => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* Object.entries(store);
    },
  } as unknown as Storage;
};

class FakeLocation implements ILOidcLocation {
  openedUrl: string = null;

  open(url: string): void {
    this.openedUrl = url;
  }

  reload(): void {}

  getCurrentHref(): string {
    return '';
  }

  getPath(): string {
    return '/current';
  }

  getOrigin(): string {
    return 'https://client.example.com';
  }
}

const createConfiguration = (overrides: Partial<OidcConfiguration> = {}): OidcConfiguration => {
  const storage = makeStorage();
  return {
    client_id: 'client',
    redirect_uri: 'https://client.example.com/callback',
    scope: 'openid profile',
    authority: 'https://issuer.example.com',
    storage,
    login_state_storage: storage,
    ...overrides,
  };
};

const createMetadata = (overrides: Record<string, unknown> = {}) => ({
  authorizationEndpoint: 'https://issuer.example.com/authorize',
  issuer: 'https://issuer.example.com',
  pushedAuthorizationRequestEndpoint: 'https://issuer.example.com/par',
  requirePushedAuthorizationRequests: false,
  ...overrides,
});

const asFetch = (mock: ReturnType<typeof vi.fn>): Fetch => mock as unknown as Fetch;

const runLogin = async ({
  configuration,
  metadata,
  fetchMock = vi.fn(),
}: {
  configuration: OidcConfiguration;
  metadata: Record<string, unknown>;
  fetchMock?: ReturnType<typeof vi.fn>;
}) => {
  const location = new FakeLocation();
  const publishEvent = vi.fn();
  const initAsync = vi.fn(async () => metadata);

  const promise = defaultLoginAsync(
    'default',
    configuration,
    publishEvent,
    initAsync,
    location,
    () => asFetch(fetchMock),
  )('/return');

  return { promise, location, publishEvent, fetchMock };
};

describe('PAR mode selection', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { crypto: globalThis.crypto },
    });
  });

  afterAll(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('maps PAR discovery metadata to the authorization service configuration', () => {
    const metadata = new OidcAuthorizationServiceConfiguration({
      authorization_endpoint: 'https://issuer.example.com/authorize',
      pushed_authorization_request_endpoint: 'https://issuer.example.com/par',
      require_pushed_authorization_requests: true,
      issuer: 'https://issuer.example.com',
    }) as any;

    expect(metadata.pushedAuthorizationRequestEndpoint).toBe('https://issuer.example.com/par');
    expect(metadata.requirePushedAuthorizationRequests).toBe(true);
  });

  it('keeps PAR disabled by default even when the server advertises it', async () => {
    const { promise, location, fetchMock } = await runLogin({
      configuration: createConfiguration(),
      metadata: createMetadata(),
    });

    await promise;

    expect(fetchMock).not.toHaveBeenCalled();
    const redirect = new URL(location.openedUrl);
    expect(redirect.searchParams.get('request_uri')).toBeNull();
    expect(redirect.searchParams.get('redirect_uri')).toBe('https://client.example.com/callback');
  });

  it('uses PAR in auto mode when the endpoint is advertised', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 201,
      json: async () => ({
        request_uri: 'urn:ietf:params:oauth:request_uri:auto',
        expires_in: 60,
      }),
    }));
    const { promise, location } = await runLogin({
      configuration: createConfiguration({ par: 'auto' }),
      metadata: createMetadata(),
      fetchMock,
    });

    await promise;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(Object.fromEntries(new URL(location.openedUrl).searchParams)).toEqual({
      client_id: 'client',
      request_uri: 'urn:ietf:params:oauth:request_uri:auto',
    });
  });

  it('uses the existing front-channel flow in auto mode when PAR is not advertised', async () => {
    const { promise, location, fetchMock } = await runLogin({
      configuration: createConfiguration({ par: 'auto' }),
      metadata: createMetadata({ pushedAuthorizationRequestEndpoint: undefined }),
    });

    await promise;

    expect(fetchMock).not.toHaveBeenCalled();
    expect(new URL(location.openedUrl).searchParams.get('redirect_uri')).toBe(
      'https://client.example.com/callback',
    );
  });

  it.each([
    ['required', false],
    ['auto', true],
  ] as const)(
    'fails before navigation in %s mode when no PAR endpoint is available',
    async (par, requirePushedAuthorizationRequests) => {
      const { promise, location, publishEvent } = await runLogin({
        configuration: createConfiguration({ par }),
        metadata: createMetadata({
          pushedAuthorizationRequestEndpoint: undefined,
          requirePushedAuthorizationRequests,
        }),
      });

      await expect(promise).rejects.toMatchObject({
        code: PushedAuthorizationRequestErrorCode.ENDPOINT_UNAVAILABLE,
      });
      expect(location.openedUrl).toBeNull();
      expect(publishEvent).toHaveBeenLastCalledWith(
        'loginAsync_error',
        expect.objectContaining({
          code: PushedAuthorizationRequestErrorCode.ENDPOINT_UNAVAILABLE,
        }),
      );
    },
  );

  it('does not silently downgrade to a front-channel request after a PAR error', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 400,
      json: async () => ({
        error: 'invalid_request',
        error_description: 'Invalid authorization request',
      }),
    }));
    const { promise, location } = await runLogin({
      configuration: createConfiguration({ par: 'auto' }),
      metadata: createMetadata(),
      fetchMock,
    });

    await expect(promise).rejects.toMatchObject({
      code: PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
      status: 400,
    });
    expect(location.openedUrl).toBeNull();
  });
});
