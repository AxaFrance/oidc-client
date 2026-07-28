export const OidcErrorCode = {
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  INTERACTION_REQUIRED: 'INTERACTION_REQUIRED',
  OAUTH_ERROR: 'OAUTH_ERROR',
  TOKEN_REQUEST_FAILED: 'TOKEN_REQUEST_FAILED',
  SILENT_LOGIN_TIMEOUT: 'SILENT_LOGIN_TIMEOUT',
  INVALID_STATE: 'INVALID_STATE',
  INVALID_NONCE: 'INVALID_NONCE',
  DPOP_NONCE_REQUIRED: 'DPOP_NONCE_REQUIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  // Backwards-compatible codes exposed by the existing specialised errors.
  STATE_MISSING: 'STATE_MISSING',
  STATE_MISMATCH: 'STATE_MISMATCH',
  NONCE_MISSING: 'NONCE_MISSING',
  ENDPOINT_UNAVAILABLE: 'ENDPOINT_UNAVAILABLE',
  REQUEST_FAILED: 'REQUEST_FAILED',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type OidcErrorCode = (typeof OidcErrorCode)[keyof typeof OidcErrorCode];

export type OidcErrorPhase =
  | 'login'
  | 'callback'
  | 'refresh'
  | 'logout'
  | 'userinfo'
  | 'api_request';

export type OidcErrorOptions = {
  phase: OidcErrorPhase;
  retryable: boolean;
  oauthError?: string;
  oauthErrorDescription?: string;
  status?: number;
  cause?: unknown;
};

export type SerializedOidcError = {
  name: string;
  message: string;
  code: OidcErrorCode;
  phase: OidcErrorPhase;
  retryable: boolean;
  oauthError?: string;
  oauthErrorDescription?: string;
  status?: number;
};

const oidcErrorCodes = new Set<string>(Object.values(OidcErrorCode));
const oidcErrorPhases = new Set<OidcErrorPhase>([
  'login',
  'callback',
  'refresh',
  'logout',
  'userinfo',
  'api_request',
]);

export class OidcError extends Error {
  readonly code: OidcErrorCode;
  readonly phase: OidcErrorPhase;
  readonly oauthError?: string;
  readonly oauthErrorDescription?: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(code: OidcErrorCode, message: string, options: OidcErrorOptions) {
    super(message);
    this.name = 'OidcError';
    this.code = code;
    this.phase = options.phase;
    this.oauthError = options.oauthError;
    this.oauthErrorDescription = options.oauthErrorDescription;
    this.retryable = options.retryable;
    this.status = options.status;
    this.cause = options.cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isOidcError = (value: unknown): value is OidcError => value instanceof OidcError;

export const isRetryableHttpStatus = (status?: number): boolean =>
  status === 408 || status === 429 || (status !== undefined && status >= 500);

export const oidcErrorCodeFromOAuthError = (oauthError?: string): OidcErrorCode => {
  switch (oauthError) {
    case 'login_required':
      return OidcErrorCode.LOGIN_REQUIRED;
    case 'consent_required':
      return OidcErrorCode.CONSENT_REQUIRED;
    case 'interaction_required':
      return OidcErrorCode.INTERACTION_REQUIRED;
    case 'use_dpop_nonce':
      return OidcErrorCode.DPOP_NONCE_REQUIRED;
    default:
      return OidcErrorCode.OAUTH_ERROR;
  }
};

export const createOAuthError = (
  oauthError: string | undefined,
  oauthErrorDescription: string | undefined,
  message: string,
  phase: OidcErrorPhase,
  status?: number,
): OidcError => {
  const code = oidcErrorCodeFromOAuthError(oauthError);
  const requiresInteraction =
    code === OidcErrorCode.LOGIN_REQUIRED ||
    code === OidcErrorCode.CONSENT_REQUIRED ||
    code === OidcErrorCode.INTERACTION_REQUIRED;
  const retryable =
    !requiresInteraction &&
    (code === OidcErrorCode.DPOP_NONCE_REQUIRED ||
      oauthError === 'server_error' ||
      oauthError === 'temporarily_unavailable' ||
      isRetryableHttpStatus(status));
  return new OidcError(code, message, {
    phase,
    retryable,
    oauthError,
    oauthErrorDescription,
    status,
  });
};

export const createNetworkError = (
  cause: unknown,
  phase: OidcErrorPhase,
  fallbackMessage = 'Network request failed',
): OidcError => {
  const message =
    cause instanceof Error && typeof cause.message === 'string' && cause.message
      ? cause.message
      : fallbackMessage;
  return new OidcError(OidcErrorCode.NETWORK_ERROR, message, {
    phase,
    retryable: true,
    cause,
  });
};

export const isNetworkErrorCause = (value: unknown): boolean => {
  if (!(value instanceof Error)) {
    return false;
  }
  return (
    value.name === 'AbortError' ||
    value.name === 'NetworkError' ||
    value.message === 'Network request failed' ||
    value.message === 'Failed to fetch' ||
    value.message === 'fetch failed'
  );
};

export const serializeOidcError = (error: OidcError): SerializedOidcError => ({
  name: error.name,
  message: error.message,
  code: error.code,
  phase: error.phase,
  retryable: error.retryable,
  oauthError: error.oauthError,
  oauthErrorDescription: error.oauthErrorDescription,
  status: error.status,
});

export const deserializeOidcError = (value: unknown): OidcError | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const serialized = value as Partial<SerializedOidcError>;
  if (
    typeof serialized.message !== 'string' ||
    typeof serialized.code !== 'string' ||
    !oidcErrorCodes.has(serialized.code) ||
    typeof serialized.phase !== 'string' ||
    !oidcErrorPhases.has(serialized.phase as OidcErrorPhase) ||
    typeof serialized.retryable !== 'boolean'
  ) {
    return null;
  }
  const error = new OidcError(serialized.code as OidcErrorCode, serialized.message, {
    phase: serialized.phase as OidcErrorPhase,
    retryable: serialized.retryable,
    oauthError: typeof serialized.oauthError === 'string' ? serialized.oauthError : undefined,
    oauthErrorDescription:
      typeof serialized.oauthErrorDescription === 'string'
        ? serialized.oauthErrorDescription
        : undefined,
    status: typeof serialized.status === 'number' ? serialized.status : undefined,
  });
  if (typeof serialized.name === 'string' && serialized.name) {
    error.name = serialized.name;
  }
  return error;
};
