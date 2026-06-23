import { describe, expect, it } from 'vitest';

import { isOidcStateError, OidcStateError, OidcStateErrorCode } from './oidcStateError';

describe('OidcStateError', () => {
  it('exposes the well-known state error codes', () => {
    expect(OidcStateErrorCode.STATE_MISSING).toBe('STATE_MISSING');
    expect(OidcStateErrorCode.STATE_MISMATCH).toBe('STATE_MISMATCH');
    expect(OidcStateErrorCode.NONCE_MISSING).toBe('NONCE_MISSING');
  });

  it('is an Error subclass with name "OidcStateError"', () => {
    const err = new OidcStateError(OidcStateErrorCode.STATE_MISSING, 'missing');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OidcStateError);
    expect(err.name).toBe('OidcStateError');
  });

  it('preserves the code and message passed to the constructor', () => {
    const err = new OidcStateError(OidcStateErrorCode.STATE_MISMATCH, 'mismatch happened');
    expect(err.code).toBe('STATE_MISMATCH');
    expect(err.message).toBe('mismatch happened');
  });

  it('is detectable via isOidcStateError', () => {
    const err = new OidcStateError(OidcStateErrorCode.NONCE_MISSING, 'nonce missing');
    expect(isOidcStateError(err)).toBe(true);
    expect(isOidcStateError(new Error('boom'))).toBe(false);
    expect(isOidcStateError(null)).toBe(false);
    expect(isOidcStateError(undefined)).toBe(false);
    expect(isOidcStateError({ code: 'STATE_MISSING' })).toBe(false);
  });
});
