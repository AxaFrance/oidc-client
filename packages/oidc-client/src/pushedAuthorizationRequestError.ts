import {
  isRetryableHttpStatus,
  OidcError,
  OidcErrorCode as BaseOidcErrorCode,
} from './oidcError.js';

export const PushedAuthorizationRequestErrorCode = {
  ENDPOINT_UNAVAILABLE: 'ENDPOINT_UNAVAILABLE',
  REQUEST_FAILED: 'REQUEST_FAILED',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type PushedAuthorizationRequestErrorCode =
  (typeof PushedAuthorizationRequestErrorCode)[keyof typeof PushedAuthorizationRequestErrorCode];

type PushedAuthorizationRequestErrorOptions = {
  status?: number;
  oauthError?: string;
  oauthErrorDescription?: string;
  cause?: unknown;
};

export class PushedAuthorizationRequestError extends OidcError {
  declare readonly code: PushedAuthorizationRequestErrorCode;

  constructor(
    code: PushedAuthorizationRequestErrorCode,
    message: string,
    options: PushedAuthorizationRequestErrorOptions = {},
  ) {
    super(code as BaseOidcErrorCode, message, {
      phase: 'login',
      retryable: options.cause !== undefined || isRetryableHttpStatus(options.status),
      status: options.status,
      oauthError: options.oauthError,
      oauthErrorDescription: options.oauthErrorDescription,
      cause: options.cause,
    });
    this.name = 'PushedAuthorizationRequestError';

    Object.setPrototypeOf(this, PushedAuthorizationRequestError.prototype);
  }
}

export const isPushedAuthorizationRequestError = (
  value: unknown,
): value is PushedAuthorizationRequestError => {
  return value instanceof PushedAuthorizationRequestError;
};
