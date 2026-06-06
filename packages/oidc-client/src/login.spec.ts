import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginCallbackAsync } from './login';

vi.mock('./initWorker.js', () => ({
  initWorkerAsync: vi.fn().mockResolvedValue(null),
}));

vi.mock('./requests.js', () => ({
  performAuthorizationRequestAsync: vi.fn(),
  performFirstTokenRequestAsync: vi.fn(),
}));

vi.mock('./jwt', () => ({
  generateJwkAsync: vi.fn(),
  generateJwtDemonstratingProofOfPossessionAsync: vi.fn(),
}));

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

describe('loginCallbackAsync - back button state mismatch', () => {
  const configurationName = 'default';
  const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

  const validTokens = {
    accessToken: 'access-token-value',
    idToken: 'id-token-value',
    refreshToken: 'refresh-token-value',
    expiresAt: futureExpiry,
    issuedAt: Math.floor(Date.now() / 1000),
    idTokenPayload: { sub: 'user1', nonce: 'nonce1' },
    accessTokenPayload: { sub: 'user1' },
  };

  const makeOidc = (tokens = null, storage: Storage = makeStorage()) => ({
    configurationName,
    tokens,
    configuration: {
      client_id: 'test-client',
      redirect_uri: 'http://localhost/callback',
      silent_redirect_uri: 'http://localhost/silent-callback',
      authority: 'http://authority',
      authority_configuration: {
        authorization_endpoint: 'http://authority/authorize',
        token_endpoint: 'http://authority/token',
        revocation_endpoint: 'http://authority/revoke',
        userinfo_endpoint: 'http://authority/userinfo',
        issuer: 'http://authority',
      },
      scope: 'openid',
      storage,
      token_renew_mode: 'access_token_or_id_token_invalid',
    },
    location: {
      getCurrentHref: () => 'http://localhost/callback?code=new-code&state=NEW_STATE_BBB',
    },
    publishEvent: vi.fn(),
    initAsync: vi.fn().mockResolvedValue({
      authorizationEndpoint: 'http://authority/authorize',
      tokenEndpoint: 'http://authority/token',
      revocationEndpoint: 'http://authority/revoke',
      userInfoEndpoint: 'http://authority/userinfo',
      issuer: 'http://authority',
      checkSessionIframe: null,
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing in-memory tokens when state is null and tokens are valid', async () => {
    const oidc = makeOidc(validTokens);

    const result = await loginCallbackAsync(oidc as any)();

    expect(result).toBeDefined();
    expect(result.tokens).toBe(validTokens);
    expect(result.callbackPath).toBe('/');
    expect(oidc.publishEvent).toHaveBeenCalledWith('loginCallbackAsync_end', {});
  });

  it('should return existing storage tokens when state is null and storage has valid tokens', async () => {
    const storage = makeStorage();
    storage[`oidc.${configurationName}`] = JSON.stringify({ tokens: validTokens });
    const oidc = makeOidc(null, storage);

    const result = await loginCallbackAsync(oidc as any)();

    expect(result).toBeDefined();
    expect(result.tokens).toBeDefined();
    expect(result.tokens.accessToken).toBe('access-token-value');
    expect(result.callbackPath).toBe('/');
  });

  it('should throw state error when state is null and no valid tokens exist', async () => {
    const oidc = makeOidc(null);

    await expect(loginCallbackAsync(oidc as any)()).rejects.toThrow(
      'State not valid (expected: undefined, received: NEW_STATE_BBB)',
    );
  });

  it('should throw state error when state is null and stored tokens are expired', async () => {
    const expiredTokens = {
      ...validTokens,
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
    };
    const storage = makeStorage();
    storage[`oidc.${configurationName}`] = JSON.stringify({ tokens: expiredTokens });
    const oidc = makeOidc(null, storage);

    await expect(loginCallbackAsync(oidc as any)()).rejects.toThrow(
      'State not valid (expected: undefined, received: NEW_STATE_BBB)',
    );
  });

  it('should throw state error when stored state differs from query state (not a back-button scenario)', async () => {
    const storage = makeStorage();
    storage[`oidc.state.${configurationName}`] = 'ORIGINAL_STATE_AAA';
    storage[`oidc.${configurationName}`] = JSON.stringify({ tokens: validTokens });
    const oidc = makeOidc(validTokens, storage);

    await expect(loginCallbackAsync(oidc as any)()).rejects.toThrow(
      'State not valid (expected: ORIGINAL_STATE_AAA, received: NEW_STATE_BBB)',
    );
  });

  it('should use loginParams callbackPath when available', async () => {
    const storage = makeStorage();
    storage[`oidc.login.${configurationName}`] = JSON.stringify({
      callbackPath: '/dashboard',
      extras: { custom: 'value' },
      scope: 'openid profile',
    });
    const oidc = makeOidc(validTokens, storage);

    const result = await loginCallbackAsync(oidc as any)();

    expect(result.callbackPath).toBe('/dashboard');
    expect(result.extras).toEqual({ custom: 'value' });
  });
});
