import { describe, expect, it, vi } from 'vitest';

import { loginCallbackAsync } from './login';

vi.mock('./initWorker', () => ({
  initWorkerAsync: vi.fn().mockResolvedValue(null),
}));

vi.mock('./initSession', () => ({
  initSession: vi.fn(),
}));

vi.mock('./requests', () => ({
  performFirstTokenRequestAsync: vi.fn(),
  performAuthorizationRequestAsync: vi.fn(),
}));

vi.mock('./parseTokens', () => ({
  isTokensOidcValid: vi.fn().mockReturnValue({ isValid: true, reason: null }),
  TokenRenewMode: { access_token_or_id_token_invalid: 'access_token_or_id_token_invalid' },
}));

describe('loginCallbackAsync test suite', () => {
  const mockStorage = {};

  const makeOidcMock = (tokens = null, href = 'http://localhost/callback?code=abc&state=newstate') => ({
    configuration: {
      client_id: 'client1',
      redirect_uri: 'http://localhost/callback',
      authority: 'http://auth',
      token_renew_mode: 'access_token_or_id_token_invalid',
      token_request_timeout: 10000,
      demonstrating_proof_of_possession: false,
      storage: mockStorage,
    },
    configurationName: 'default',
    tokens,
    publishEvent: vi.fn(),
    initAsync: vi.fn().mockResolvedValue({
      issuer: 'http://auth',
      authorizationEndpoint: 'http://auth/authorize',
      tokenEndpoint: 'http://auth/token',
      checkSessionIframe: null,
    }),
    location: {
      getCurrentHref: vi.fn().mockReturnValue(href),
    },
    startCheckSessionAsync: vi.fn().mockResolvedValue(undefined),
  });

  it('should redirect to callbackPath when state mismatches but user is already authenticated via oidc.tokens', async () => {
    const { initSession } = await import('./initSession');

    const existingTokens = {
      accessToken: 'existing-access',
      refreshToken: 'existing-refresh',
      idToken: 'existing-id',
      expiresAt: 9999999999,
    };

    const sessionMock = {
      initAsync: vi.fn().mockResolvedValue({ tokens: null, status: null }),
      setSessionStateAsync: vi.fn().mockResolvedValue(undefined),
      getNonceAsync: vi.fn().mockResolvedValue({ nonce: 'nonce123' }),
      getLoginParams: vi.fn().mockReturnValue({ callbackPath: '/home', extras: null, scope: 'openid' }),
      getStateAsync: vi.fn().mockResolvedValue(null), // state already consumed
    };
    vi.mocked(initSession).mockReturnValue(sessionMock as any);

    const oidc = makeOidcMock(existingTokens);

    const result = await loginCallbackAsync(oidc as any)();

    expect(oidc.publishEvent).toHaveBeenCalledWith(
      expect.stringContaining('loginCallbackAsync_end'),
      expect.anything(),
    );
    expect(result).toMatchObject({
      tokens: existingTokens,
      callbackPath: '/home',
    });
  });

  it('should redirect to callbackPath when state mismatches and user is authenticated via stored session tokens', async () => {
    const { initSession } = await import('./initSession');

    const storedTokens = {
      accessToken: 'stored-access',
      refreshToken: 'stored-refresh',
      idToken: 'stored-id',
      expiresAt: 9999999999,
    };

    const sessionMock = {
      initAsync: vi.fn().mockResolvedValue({ tokens: storedTokens, status: null }),
      setSessionStateAsync: vi.fn().mockResolvedValue(undefined),
      getNonceAsync: vi.fn().mockResolvedValue({ nonce: 'nonce123' }),
      getLoginParams: vi.fn().mockReturnValue({ callbackPath: '/dashboard', extras: null, scope: 'openid' }),
      getStateAsync: vi.fn().mockResolvedValue(null), // state already consumed
    };
    vi.mocked(initSession).mockReturnValue(sessionMock as any);

    const oidc = makeOidcMock(null); // no oidc.tokens yet, but session has tokens

    const result = await loginCallbackAsync(oidc as any)();

    expect(result).toMatchObject({
      tokens: storedTokens,
      callbackPath: '/dashboard',
    });
  });

  it('should throw error when state mismatches and user is not authenticated', async () => {
    const { initSession } = await import('./initSession');

    const sessionMock = {
      initAsync: vi.fn().mockResolvedValue({ tokens: null, status: null }),
      setSessionStateAsync: vi.fn().mockResolvedValue(undefined),
      getNonceAsync: vi.fn().mockResolvedValue({ nonce: 'nonce123' }),
      getLoginParams: vi.fn().mockReturnValue({ callbackPath: '/home', extras: null, scope: 'openid' }),
      getStateAsync: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(initSession).mockReturnValue(sessionMock as any);

    const oidc = makeOidcMock(null); // not authenticated

    await expect(loginCallbackAsync(oidc as any)()).rejects.toThrow(
      'State not valid (expected: null, received: newstate)',
    );
  });
});
