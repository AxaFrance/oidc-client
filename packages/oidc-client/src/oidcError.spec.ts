import { describe, expect, it } from 'vitest';

import {
  isOidcError,
  isOidcLoginRequiredError,
  isOidcServerError,
  isOidcSilentLoginTimeoutError,
  isOidcTokenRequestFailedError,
  OidcError,
  OidcErrorCode,
  OidcLoginRequiredError,
  OidcServerError,
  OidcSilentLoginTimeoutError,
  OidcTokenRequestFailedError,
  TokenRequestFailedPhase,
} from './oidcError';

describe('OidcErrorCode', () => {
  it('exposes the well-known error codes as stable string values', () => {
    expect(OidcErrorCode.SILENT_LOGIN_TIMEOUT).toBe('SILENT_LOGIN_TIMEOUT');
    expect(OidcErrorCode.OIDC_SERVER_ERROR).toBe('OIDC_SERVER_ERROR');
    expect(OidcErrorCode.LOGIN_REQUIRED).toBe('LOGIN_REQUIRED');
    expect(OidcErrorCode.TOKEN_REQUEST_FAILED).toBe('TOKEN_REQUEST_FAILED');
  });
});

describe('TokenRequestFailedPhase', () => {
  it('exposes the three well-known upstream phases', () => {
    expect(TokenRequestFailedPhase.LOGIN_CALLBACK).toBe('login_callback');
    expect(TokenRequestFailedPhase.REFRESH).toBe('refresh');
    expect(TokenRequestFailedPhase.SYNC).toBe('sync');
  });
});

describe('OidcError', () => {
  it('is an Error subclass that carries a code and an optional phase', () => {
    const err = new OidcError('boom', 'CUSTOM_CODE', 'custom_phase');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OidcError);
    expect(err.message).toBe('boom');
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.phase).toBe('custom_phase');
    expect(err.name).toBe('OidcError');
  });

  it('leaves phase undefined when not provided', () => {
    const err = new OidcError('boom', 'CUSTOM_CODE');
    expect(err.phase).toBeUndefined();
  });

  it('is detectable via isOidcError', () => {
    expect(isOidcError(new OidcError('boom', 'X'))).toBe(true);
    expect(isOidcError(new Error('boom'))).toBe(false);
    expect(isOidcError(null)).toBe(false);
    expect(isOidcError({ code: 'X' })).toBe(false);
  });
});

describe('OidcSilentLoginTimeoutError', () => {
  it('preserves the legacy "timeout" message for backwards compatibility', () => {
    const err = new OidcSilentLoginTimeoutError();
    expect(err.message).toBe('timeout');
  });

  it('exposes the SILENT_LOGIN_TIMEOUT code and proper subclass identity', () => {
    const err = new OidcSilentLoginTimeoutError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OidcError);
    expect(err).toBeInstanceOf(OidcSilentLoginTimeoutError);
    expect(err.code).toBe(OidcErrorCode.SILENT_LOGIN_TIMEOUT);
    expect(err.name).toBe('OidcSilentLoginTimeoutError');
  });

  it('is detectable via isOidcSilentLoginTimeoutError', () => {
    expect(isOidcSilentLoginTimeoutError(new OidcSilentLoginTimeoutError())).toBe(true);
    expect(isOidcSilentLoginTimeoutError(new Error('timeout'))).toBe(false);
    expect(isOidcSilentLoginTimeoutError(new OidcError('timeout', 'OTHER'))).toBe(false);
  });
});

describe('OidcServerError', () => {
  it('exposes the raw server error and description on the typed fields', () => {
    const err = new OidcServerError('invalid_request', 'redirect_uri mismatch');
    expect(err).toBeInstanceOf(OidcError);
    expect(err).toBeInstanceOf(OidcServerError);
    expect(err.code).toBe(OidcErrorCode.OIDC_SERVER_ERROR);
    expect(err.serverError).toBe('invalid_request');
    expect(err.serverErrorDescription).toBe('redirect_uri mismatch');
  });

  it('builds a default message that preserves the historical format', () => {
    const err = new OidcServerError('invalid_request', 'redirect_uri mismatch');
    expect(err.message).toBe('Error from OIDC server: invalid_request - redirect_uri mismatch');
  });

  it('accepts a custom message override', () => {
    const err = new OidcServerError('invalid_request', 'desc', 'custom message');
    expect(err.message).toBe('custom message');
  });

  it('is detectable via isOidcServerError, including subclasses', () => {
    expect(isOidcServerError(new OidcServerError('a', 'b'))).toBe(true);
    expect(isOidcServerError(new OidcLoginRequiredError())).toBe(true);
    expect(isOidcServerError(new Error('boom'))).toBe(false);
  });
});

describe('OidcLoginRequiredError', () => {
  it('is a specialization of OidcServerError with code LOGIN_REQUIRED', () => {
    const err = new OidcLoginRequiredError('user not signed in');
    expect(err).toBeInstanceOf(OidcServerError);
    expect(err).toBeInstanceOf(OidcLoginRequiredError);
    expect(err.code).toBe(OidcErrorCode.LOGIN_REQUIRED);
    expect(err.serverError).toBe('login_required');
    expect(err.serverErrorDescription).toBe('user not signed in');
    expect(err.name).toBe('OidcLoginRequiredError');
  });

  it('is detectable via isOidcLoginRequiredError but not via timeout/token guards', () => {
    const err = new OidcLoginRequiredError();
    expect(isOidcLoginRequiredError(err)).toBe(true);
    expect(isOidcServerError(err)).toBe(true);
    expect(isOidcError(err)).toBe(true);
    expect(isOidcSilentLoginTimeoutError(err)).toBe(false);
    expect(isOidcTokenRequestFailedError(err)).toBe(false);
  });
});

describe('OidcTokenRequestFailedError', () => {
  it('preserves the legacy "Token request failed" message by default', () => {
    const err = new OidcTokenRequestFailedError(TokenRequestFailedPhase.LOGIN_CALLBACK);
    expect(err.message).toBe('Token request failed');
  });

  it('carries the phase discriminator so callers can disambiguate call sites', () => {
    const loginCallback = new OidcTokenRequestFailedError(TokenRequestFailedPhase.LOGIN_CALLBACK);
    const refresh = new OidcTokenRequestFailedError(TokenRequestFailedPhase.REFRESH);
    const sync = new OidcTokenRequestFailedError(TokenRequestFailedPhase.SYNC);

    expect(loginCallback.phase).toBe('login_callback');
    expect(refresh.phase).toBe('refresh');
    expect(sync.phase).toBe('sync');
  });

  it('exposes the TOKEN_REQUEST_FAILED code and proper subclass identity', () => {
    const err = new OidcTokenRequestFailedError(TokenRequestFailedPhase.LOGIN_CALLBACK);
    expect(err).toBeInstanceOf(OidcError);
    expect(err).toBeInstanceOf(OidcTokenRequestFailedError);
    expect(err.code).toBe(OidcErrorCode.TOKEN_REQUEST_FAILED);
    expect(err.name).toBe('OidcTokenRequestFailedError');
  });

  it('accepts a custom message override', () => {
    const err = new OidcTokenRequestFailedError(
      TokenRequestFailedPhase.REFRESH,
      'custom token failure',
    );
    expect(err.message).toBe('custom token failure');
  });

  it('is detectable via isOidcTokenRequestFailedError', () => {
    const err = new OidcTokenRequestFailedError(TokenRequestFailedPhase.SYNC);
    expect(isOidcTokenRequestFailedError(err)).toBe(true);
    expect(isOidcTokenRequestFailedError(new Error('Token request failed'))).toBe(false);
  });
});
