/**
 * Typed error layer for the oidc-client library.
 *
 * Historically the library threw bare `new Error('...')` instances in several
 * control-flow-relevant places, forcing consumers to match against
 * `error.message` substrings to decide whether to retry, redirect or surface
 * an error to the user. That is brittle to message-text changes between
 * releases and conflates unrelated failure modes (e.g. the same
 * `"Token request failed"` message can surface from three different
 * code paths).
 *
 * This module introduces an additive typed-error hierarchy: errors expose a
 * stable, machine-readable {@link OidcError.code} (and, where relevant, a
 * {@link OidcError.phase} discriminator) while preserving the original
 * `message` text — so existing string-matching keeps working and consumers
 * who care can migrate to `error instanceof OidcSilentLoginTimeoutError` or
 * `error.code === OidcErrorCode.SILENT_LOGIN_TIMEOUT`.
 *
 * See https://github.com/AxaFrance/oidc-client/issues/1676
 */

/**
 * Stable, machine-readable codes for typed OIDC errors. The string values
 * are part of the library's public contract and will not change between
 * minor releases.
 */
export const OidcErrorCode = {
  /** A silent (iframe-based) renewal exceeded `silent_login_timeout`. */
  SILENT_LOGIN_TIMEOUT: 'SILENT_LOGIN_TIMEOUT',
  /**
   * The authorization server returned an error response. The original
   * `error` / `error_description` query parameters are preserved on
   * {@link OidcServerError.serverError} and
   * {@link OidcServerError.serverErrorDescription}.
   */
  OIDC_SERVER_ERROR: 'OIDC_SERVER_ERROR',
  /**
   * The authorization server explicitly answered `login_required` (the user
   * needs to re-authenticate interactively). This is a specialization of
   * {@link OidcErrorCode.OIDC_SERVER_ERROR}.
   */
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  /**
   * The token endpoint did not return a successful response. The
   * {@link OidcTokenRequestFailedError.phase} field distinguishes the
   * upstream call site (login callback, refresh, or cross-tab sync).
   */
  TOKEN_REQUEST_FAILED: 'TOKEN_REQUEST_FAILED',
} as const;

// Companion type that mirrors the const above. We intentionally reuse the
// same name so that `OidcErrorCode` works as both a value namespace and a
// type for consumers.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type OidcErrorCode = (typeof OidcErrorCode)[keyof typeof OidcErrorCode];

/**
 * Identifies the upstream code path that produced an
 * {@link OidcTokenRequestFailedError}. Consumers who want to react
 * differently to a fresh login failure, a silent refresh failure or a
 * cross-tab sync failure should switch on this value rather than the
 * dispatched event name.
 */
export const TokenRequestFailedPhase = {
  /** Token request issued from the authorization-code callback. */
  LOGIN_CALLBACK: 'login_callback',
  /** Token request issued from a refresh-token renewal. */
  REFRESH: 'refresh',
  /** Token request issued from a cross-tab token synchronisation. */
  SYNC: 'sync',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TokenRequestFailedPhase =
  (typeof TokenRequestFailedPhase)[keyof typeof TokenRequestFailedPhase];

/**
 * Base class for all typed errors thrown by oidc-client.
 *
 * Carries a stable {@link code} discriminator and an optional {@link phase}
 * to distinguish call sites that share the same code. Subclasses set a
 * specific `name` so that errors are easy to identify in logs and across
 * realms.
 *
 * Existing consumers that match `error.message` keep working: subclasses
 * preserve the original message text.
 */
export class OidcError extends Error {
  readonly code: string;
  readonly phase?: string;

  constructor(message: string, code: string, phase?: string) {
    super(message);
    this.name = 'OidcError';
    this.code = code;
    this.phase = phase;

    // Keep prototype chain intact when transpiled to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a silent (iframe-based) login or token renewal exceeds the
 * configured `silent_login_timeout`.
 *
 * The message is kept as `"timeout"` for backwards compatibility with
 * consumers doing `error.message === 'timeout'`.
 */
export class OidcSilentLoginTimeoutError extends OidcError {
  constructor(message = 'timeout') {
    super(message, OidcErrorCode.SILENT_LOGIN_TIMEOUT);
    this.name = 'OidcSilentLoginTimeoutError';
    Object.setPrototypeOf(this, OidcSilentLoginTimeoutError.prototype);
  }
}

/**
 * Thrown when the authorization server responds with an `error` /
 * `error_description` query parameter on the callback URL (e.g.
 * `interaction_required`, `consent_required`, `invalid_request`, ...).
 *
 * The raw values are exposed verbatim on {@link serverError} and
 * {@link serverErrorDescription} so that callers can react to specific
 * server-side codes without parsing the message string.
 */
export class OidcServerError extends OidcError {
  readonly serverError?: string;
  readonly serverErrorDescription?: string;

  constructor(
    serverError: string | undefined,
    serverErrorDescription: string | undefined,
    message?: string,
    code: string = OidcErrorCode.OIDC_SERVER_ERROR,
  ) {
    super(message ?? `Error from OIDC server: ${serverError} - ${serverErrorDescription}`, code);
    this.name = 'OidcServerError';
    this.serverError = serverError;
    this.serverErrorDescription = serverErrorDescription;
    Object.setPrototypeOf(this, OidcServerError.prototype);
  }
}

/**
 * Specialization of {@link OidcServerError} for the very common
 * `login_required` response: the user must re-authenticate interactively.
 *
 * Consumers can branch on `error instanceof OidcLoginRequiredError`
 * instead of doing `error.message.includes('login_required')`.
 */
export class OidcLoginRequiredError extends OidcServerError {
  constructor(serverErrorDescription?: string, message?: string) {
    super('login_required', serverErrorDescription, message, OidcErrorCode.LOGIN_REQUIRED);
    this.name = 'OidcLoginRequiredError';
    Object.setPrototypeOf(this, OidcLoginRequiredError.prototype);
  }
}

/**
 * Thrown when a token endpoint request did not return a successful
 * response.
 *
 * The same message text (`"Token request failed"`) can originate from three
 * different upstream paths; {@link phase} disambiguates them so that
 * callers can implement path-specific recovery without inspecting the
 * dispatched event name.
 */
export class OidcTokenRequestFailedError extends OidcError {
  // Narrow the inherited `phase` field to the well-known union for
  // consumers who pattern-match on it. The value itself is set by the
  // base constructor.
  declare readonly phase: TokenRequestFailedPhase;

  constructor(phase: TokenRequestFailedPhase, message = 'Token request failed') {
    super(message, OidcErrorCode.TOKEN_REQUEST_FAILED, phase);
    this.name = 'OidcTokenRequestFailedError';
    Object.setPrototypeOf(this, OidcTokenRequestFailedError.prototype);
  }
}

/** Type guard for {@link OidcError} and any of its subclasses. */
export const isOidcError = (value: unknown): value is OidcError => {
  return value instanceof OidcError;
};

/** Type guard for {@link OidcSilentLoginTimeoutError}. */
export const isOidcSilentLoginTimeoutError = (
  value: unknown,
): value is OidcSilentLoginTimeoutError => {
  return value instanceof OidcSilentLoginTimeoutError;
};

/** Type guard for {@link OidcServerError} (and its subclasses). */
export const isOidcServerError = (value: unknown): value is OidcServerError => {
  return value instanceof OidcServerError;
};

/** Type guard for {@link OidcLoginRequiredError}. */
export const isOidcLoginRequiredError = (value: unknown): value is OidcLoginRequiredError => {
  return value instanceof OidcLoginRequiredError;
};

/** Type guard for {@link OidcTokenRequestFailedError}. */
export const isOidcTokenRequestFailedError = (
  value: unknown,
): value is OidcTokenRequestFailedError => {
  return value instanceof OidcTokenRequestFailedError;
};
