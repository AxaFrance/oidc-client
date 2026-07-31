import { describe, expect, it } from 'vitest';

import {
  createNetworkError,
  createOAuthError,
  deserializeOidcError,
  isOidcError,
  OidcError,
  OidcErrorCode,
  serializeOidcError,
} from './oidcError';

describe('OidcError', () => {
  it('preserves all public fields and the Error prototype chain', () => {
    const cause = new TypeError('fetch failed');
    const error = new OidcError(OidcErrorCode.TOKEN_REQUEST_FAILED, 'Token request failed', {
      phase: 'refresh',
      retryable: true,
      status: 503,
      oauthError: 'temporarily_unavailable',
      oauthErrorDescription: 'Try again later',
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OidcError);
    expect(error.name).toBe('OidcError');
    expect(error.message).toBe('Token request failed');
    expect(error).toMatchObject({
      code: OidcErrorCode.TOKEN_REQUEST_FAILED,
      phase: 'refresh',
      retryable: true,
      status: 503,
      oauthError: 'temporarily_unavailable',
      oauthErrorDescription: 'Try again later',
      cause,
    });
    expect(isOidcError(error)).toBe(true);
    expect(isOidcError(new Error('other'))).toBe(false);
  });

  it.each([
    ['login_required', OidcErrorCode.LOGIN_REQUIRED, false],
    ['consent_required', OidcErrorCode.CONSENT_REQUIRED, false],
    ['interaction_required', OidcErrorCode.INTERACTION_REQUIRED, false],
    ['server_error', OidcErrorCode.OAUTH_ERROR, true],
    ['temporarily_unavailable', OidcErrorCode.OAUTH_ERROR, true],
    ['access_denied', OidcErrorCode.OAUTH_ERROR, false],
  ] as const)('maps OAuth error %s to %s', (oauthError, code, retryable) => {
    const error = createOAuthError(
      oauthError,
      'description',
      `Error from OIDC server: ${oauthError} - description`,
      'callback',
    );

    expect(error).toMatchObject({
      code,
      phase: 'callback',
      retryable,
      oauthError,
      oauthErrorDescription: 'description',
    });
  });

  it('wraps a network failure without changing its message', () => {
    const cause = new Error('Failed to fetch');
    const error = createNetworkError(cause, 'userinfo');

    expect(error).toMatchObject({
      code: OidcErrorCode.NETWORK_ERROR,
      message: 'Failed to fetch',
      phase: 'userinfo',
      retryable: true,
      cause,
    });
  });

  it('serializes and reconstructs an OidcError without stack or cause', () => {
    const original = new OidcError(OidcErrorCode.LOGIN_REQUIRED, 'login required', {
      phase: 'refresh',
      retryable: false,
      oauthError: 'login_required',
      oauthErrorDescription: 'Sign in again',
      cause: new Error('not cloneable'),
    });

    const serialized = serializeOidcError(original);
    expect(serialized).not.toHaveProperty('stack');
    expect(serialized).not.toHaveProperty('cause');

    const reconstructed = deserializeOidcError(serialized);
    expect(reconstructed).toBeInstanceOf(OidcError);
    expect(reconstructed).toMatchObject({
      name: 'OidcError',
      message: 'login required',
      code: OidcErrorCode.LOGIN_REQUIRED,
      phase: 'refresh',
      retryable: false,
      oauthError: 'login_required',
      oauthErrorDescription: 'Sign in again',
    });
    expect(reconstructed?.cause).toBeUndefined();
  });
});
