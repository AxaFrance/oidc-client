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

export class PushedAuthorizationRequestError extends Error {
  readonly code: PushedAuthorizationRequestErrorCode;
  readonly status?: number;
  readonly oauthError?: string;
  readonly oauthErrorDescription?: string;
  readonly cause?: unknown;

  constructor(
    code: PushedAuthorizationRequestErrorCode,
    message: string,
    options: PushedAuthorizationRequestErrorOptions = {},
  ) {
    super(message);
    this.name = 'PushedAuthorizationRequestError';
    this.code = code;
    this.status = options.status;
    this.oauthError = options.oauthError;
    this.oauthErrorDescription = options.oauthErrorDescription;
    this.cause = options.cause;

    Object.setPrototypeOf(this, PushedAuthorizationRequestError.prototype);
  }
}

export const isPushedAuthorizationRequestError = (
  value: unknown,
): value is PushedAuthorizationRequestError => {
  return value instanceof PushedAuthorizationRequestError;
};
