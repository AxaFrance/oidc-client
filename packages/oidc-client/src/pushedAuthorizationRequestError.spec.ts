import { describe, expect, it } from 'vitest';

import {
  isPushedAuthorizationRequestError,
  PushedAuthorizationRequestError,
  PushedAuthorizationRequestErrorCode,
} from './pushedAuthorizationRequestError';

describe('PushedAuthorizationRequestError', () => {
  it('exposes stable error codes', () => {
    expect(PushedAuthorizationRequestErrorCode.ENDPOINT_UNAVAILABLE).toBe('ENDPOINT_UNAVAILABLE');
    expect(PushedAuthorizationRequestErrorCode.REQUEST_FAILED).toBe('REQUEST_FAILED');
    expect(PushedAuthorizationRequestErrorCode.INVALID_RESPONSE).toBe('INVALID_RESPONSE');
  });

  it('preserves PAR and OAuth error details', () => {
    const cause = new Error('network failure');
    const error = new PushedAuthorizationRequestError(
      PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
      'PAR failed',
      {
        status: 400,
        oauthError: 'invalid_request',
        oauthErrorDescription: 'Invalid redirect URI',
        cause,
      },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PushedAuthorizationRequestError');
    expect(error.code).toBe('REQUEST_FAILED');
    expect(error.status).toBe(400);
    expect(error.oauthError).toBe('invalid_request');
    expect(error.oauthErrorDescription).toBe('Invalid redirect URI');
    expect(error.cause).toBe(cause);
    expect(isPushedAuthorizationRequestError(error)).toBe(true);
    expect(isPushedAuthorizationRequestError(new Error('other'))).toBe(false);
  });
});
