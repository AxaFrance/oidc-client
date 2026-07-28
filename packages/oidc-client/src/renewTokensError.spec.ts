import { describe, expect, it } from 'vitest';

import Oidc from './oidc';
import { OidcError, OidcErrorCode } from './oidcError';
import { Tokens } from './parseTokens';

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
});
