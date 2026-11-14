import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initSession } from './initSession';
import { Oidc } from './oidc';
import { OidcClient } from './oidcClient';
import { TokenAutomaticRenewMode } from './types';

const issuer = 'https://issuer.example.com';
const href = 'https://app.example.com/callback?code=code&state=state';
const idToken = (): string =>
  `e30.${btoa(JSON.stringify({ iss: issuer, sub: 'alice', nonce: 'nonce', exp: Date.now() / 1000 + 3600, iat: Date.now() / 1000 }))}.signature`;
let storage: Storage;
let client: OidcClient;
let oidc: Oidc;
let postMessage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  storage = Object.create(null) as Storage;
  const blockedStorage = new Proxy({} as Storage, {
    get: () => {
      throw new DOMException('Native session storage is blocked.', 'SecurityError');
    },
    ownKeys: () => {
      throw new DOMException('Native session storage is blocked.', 'SecurityError');
    },
  });
  postMessage = vi.fn();
  vi.stubGlobal('sessionStorage', blockedStorage);
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('window', {
    sessionStorage: blockedStorage,
    location: { href },
    parent: { postMessage },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: 'access',
            refresh_token: 'refresh',
            id_token: idToken(),
            expires_in: 3600,
          }),
        ),
    ),
  );
  oidc = new Oidc(
    {
      authority: issuer,
      authority_configuration: {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        revocation_endpoint: `${issuer}/revoke`,
      },
      client_id: 'client',
      scope: 'openid',
      redirect_uri: 'https://app.example.com/callback',
      silent_redirect_uri: 'https://app.example.com/silent-callback',
      storage,
      login_state_storage: storage,
      token_automatic_renew_mode: TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted,
    },
    'legacy',
    () => fetch,
    {
      getCurrentHref: () => href,
      getOrigin: () => 'https://app.example.com',
      getPath: () => '/callback',
      open: vi.fn(),
      reload: vi.fn(),
    },
  );
  client = new OidcClient(oidc);
  const session = initSession('legacy', storage, storage);
  session.setStateAsync('state');
  session.setNonceAsync({ nonce: 'nonce' });
  session.setCodeVerifierAsync('verifier');
  session.setLoginParams({ callbackPath: '/after', extras: null, scope: 'openid' });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('legacy clients with custom storage and no resource registry', () => {
  it('completes interactive callbacks without accessing native sessionStorage', async () => {
    await expect(client.loginCallbackAsync()).resolves.toEqual({ callbackPath: '/after' });
    expect(client.tokens.accessToken).toBe('access');
    expect(JSON.parse(storage['oidc.legacy']).tokens.accessToken).toBe('access');
  });

  it('posts successful silent callbacks without accessing native sessionStorage', async () => {
    await client.silentLoginCallbackAsync();
    expect(postMessage).toHaveBeenCalledWith(
      expect.stringContaining('legacy_oidc_tokens:'),
      'https://app.example.com',
    );
  });

  it('clears the local session without accessing native sessionStorage', async () => {
    oidc.tokens = { accessToken: 'access' } as Oidc['tokens'];
    initSession('legacy', storage).setTokens(oidc.tokens);
    await expect(client.clearSessionAsync()).resolves.toBeUndefined();
    expect(client.tokens).toBeNull();
    expect(JSON.parse(storage['oidc.legacy']).tokens).toBeNull();
  });
});

describe('legacy explicit silent-login results', () => {
  it('resolves with an error value on timeout rather than rejecting', async () => {
    oidc.configuration.silent_login_timeout = 25;
    vi.stubGlobal('document', {
      createElement: () => ({ setAttribute: vi.fn(), style: {}, remove: vi.fn() }),
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal('window', {
      ...window,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const result = client.loginAsync(undefined, undefined, false, undefined, true);
    const assertion = expect(result).resolves.toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it('resolves without starting authorization when silent callbacks are disabled', async () => {
    oidc.configuration.silent_redirect_uri = undefined;
    oidc.configuration.silent_login_uri = undefined;
    await expect(
      client.loginAsync(undefined, undefined, false, undefined, true),
    ).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
