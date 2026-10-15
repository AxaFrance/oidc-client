import { afterEach, describe, expect, it, vi } from 'vitest';

import * as initSessionModule from './initSession';
import * as initWorkerModule from './initWorker';
import Oidc from './oidc';
import { OidcError, OidcErrorCode } from './oidcError';
import { OidcStateError, OidcStateErrorCode } from './oidcStateError';
import { Tokens } from './parseTokens';
import { renewTokensAndStartTimerResultAsync } from './renewTokens';
import * as requestsModule from './requests';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('strict token renewal', () => {
  it('keeps renewTokensAsync non-throwing while the strict method throws the shared error', async () => {
    const error = new OidcError(OidcErrorCode.TOKEN_REQUEST_FAILED, 'Token request failed', {
      phase: 'refresh',
      retryable: false,
      status: 400,
      oauthError: 'invalid_grant',
    });
    const oidc = Object.create(Oidc.prototype) as Oidc;
    const sharedResult = Promise.resolve({
      tokens: null,
      status: 'SESSION_LOST',
      error,
    });
    oidc.renewTokensPromise = sharedResult;

    const nonThrowing = oidc.renewTokensAsync();
    const strict = oidc.renewTokensOrThrowAsync();

    await expect(nonThrowing).resolves.toBeNull();
    await expect(strict).rejects.toBe(error);
  });

  it('returns renewed tokens from the strict method', async () => {
    const tokens = {
      accessToken: 'access-token',
      expiresAt: Date.now() / 1000 + 3600,
    } as Tokens;
    const oidc = Object.create(Oidc.prototype) as Oidc;
    oidc.renewTokensPromise = Promise.resolve({
      tokens,
      status: 'LOGGED_IN',
    });

    await expect(oidc.renewTokensOrThrowAsync()).resolves.toBe(tokens);
  });

  it('returns SESSION_LOST with OidcStateError(NONCE_MISSING) when refresh succeeds but nonce storage is missing', async () => {
    vi.stubGlobal('navigator', { locks: undefined, onLine: true });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('window', { sessionStorage: {} });
    vi.spyOn(initWorkerModule, 'initWorkerAsync').mockResolvedValue(null);
    vi.spyOn(initSessionModule, 'initSession').mockReturnValue({
      getNonceAsync: vi.fn().mockResolvedValue({ nonce: undefined }),
      initAsync: vi.fn().mockResolvedValue({
        status: null,
        tokens: {
          accessToken: 'access-token',
          expiresAt: 0,
          issuedAt: 1,
          refreshToken: 'refresh-token',
        },
      }),
      setTokens: vi.fn(),
    } as never);
    vi.spyOn(requestsModule, 'performTokenRequestAsync').mockReturnValue(
      vi.fn().mockResolvedValue({
        data: { accessToken: 'renewed-token' },
        status: 200,
        success: true,
      }) as never,
    );

    const oidc = Object.create(Oidc.prototype) as Oidc;
    oidc.configurationName = 'default';
    oidc.configuration = {
      authority: 'https://issuer.example.com',
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      refresh_time_before_tokens_expiration_in_second: 0,
      scope: 'openid',
      storage: {},
      token_renew_mode: 'access_token_or_id_token_invalid',
    } as never;
    oidc.destroyAsync = vi.fn();
    oidc.getFetch = vi.fn();
    oidc.initAsync = vi.fn().mockResolvedValue({
      tokenEndpoint: 'https://issuer.example.com/token',
    });
    oidc.publishEvent = vi.fn();
    oidc.tokens = {
      accessToken: 'access-token',
      expiresAt: 0,
      issuedAt: 1,
      refreshToken: 'refresh-token',
    } as Tokens;

    const result = await renewTokensAndStartTimerResultAsync(oidc);

    expect(result.status).toBe('SESSION_LOST');
    expect(result.tokens).toBeNull();
    expect(result.error).toBeInstanceOf(OidcStateError);
    expect(result.error).toMatchObject({
      code: OidcStateErrorCode.NONCE_MISSING,
      phase: 'refresh',
      retryable: false,
    });
    expect(oidc.tokens).toBeNull();
  });
});

describe('syncTokensAsync events', () => {
  const createOidc = (expiresAt: number) => {
    const oidc = Object.create(Oidc.prototype) as Oidc;
    oidc.configurationName = 'default';
    oidc.configuration = {
      authority: 'https://issuer.example.com',
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      refresh_time_before_tokens_expiration_in_second: 0,
      scope: 'openid',
      storage: {},
      token_renew_mode: 'access_token_or_id_token_invalid',
    } as never;
    oidc.destroyAsync = vi.fn();
    oidc.getFetch = vi.fn();
    oidc.initAsync = vi.fn().mockResolvedValue({
      tokenEndpoint: 'https://issuer.example.com/token',
    });
    oidc.publishEvent = vi.fn();
    oidc.tokens = {
      accessToken: 'access-token',
      expiresAt,
      issuedAt: 1,
      refreshToken: 'refresh-token',
    } as Tokens;
    return oidc;
  };

  const mockSessionWithTokens = (expiresAt: number) => {
    vi.spyOn(initSessionModule, 'initSession').mockReturnValue({
      getNonceAsync: vi.fn().mockResolvedValue({ nonce: null }),
      initAsync: vi.fn().mockResolvedValue({
        status: null,
        tokens: {
          accessToken: 'access-token',
          expiresAt,
          issuedAt: 1,
          refreshToken: 'refresh-token',
        },
      }),
      setTokens: vi.fn(),
    } as never);
  };

  const publishedEventNames = (oidc: Oidc) =>
    (oidc.publishEvent as any).mock.calls.map(([name]) => name);

  it('publishes syncTokensAsync_begin then syncTokensAsync_end once tokens are synchronized', async () => {
    const expiresAt = Date.now() / 1000 + 3600;
    vi.stubGlobal('navigator', { locks: undefined, onLine: true });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('window', { sessionStorage: {} });
    vi.spyOn(initWorkerModule, 'initWorkerAsync').mockResolvedValue(null);
    mockSessionWithTokens(expiresAt);
    const oidc = createOidc(expiresAt);

    const result = await renewTokensAndStartTimerResultAsync(oidc);

    expect(result.status).toBe('LOGGED_IN');
    expect(publishedEventNames(oidc)).toEqual(['syncTokensAsync_begin', 'syncTokensAsync_end']);
    expect(oidc.publishEvent).toHaveBeenNthCalledWith(2, 'syncTokensAsync_end', {
      status: 'LOGGED_IN',
    });
  });

  it('publishes a single begin/end pair when the lock is not available on the first attempt', async () => {
    const expiresAt = Date.now() / 1000 + 3600;
    let lockRequestCount = 0;
    vi.stubGlobal('navigator', {
      onLine: true,
      locks: {
        request: vi.fn(
          (_resource: string, _options: unknown, callback: (lock: unknown) => unknown) =>
            Promise.resolve(++lockRequestCount === 1 ? callback(null) : callback({ name: 'lock' })),
        ),
      },
    });
    vi.stubGlobal('document', { hidden: false });
    vi.stubGlobal('window', { sessionStorage: {} });
    vi.spyOn(initWorkerModule, 'initWorkerAsync').mockResolvedValue(null);
    mockSessionWithTokens(expiresAt);
    const oidc = createOidc(expiresAt);

    const result = await renewTokensAndStartTimerResultAsync(oidc);

    expect(result.status).toBe('LOGGED_IN');
    expect(publishedEventNames(oidc)).toEqual([
      'syncTokensAsync_lock_not_available',
      'syncTokensAsync_begin',
      'syncTokensAsync_end',
    ]);
  });

  it('publishes syncTokensAsync_error and rethrows when the synchronization throws', async () => {
    vi.stubGlobal('navigator', { locks: undefined, onLine: false });
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('window', { sessionStorage: {} });
    vi.spyOn(initWorkerModule, 'initWorkerAsync').mockResolvedValue(null);
    const oidc = createOidc(Date.now() / 1000 + 3600);

    await expect(renewTokensAndStartTimerResultAsync(oidc)).rejects.toThrow();

    expect(publishedEventNames(oidc)).toEqual(['syncTokensAsync_begin', 'syncTokensAsync_error']);
    expect(oidc.publishEvent).toHaveBeenNthCalledWith(
      2,
      'syncTokensAsync_error',
      expect.objectContaining({ message: 'sync tokens error' }),
    );
  });
});
