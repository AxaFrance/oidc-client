/**
 * Stable, machine-readable codes for OIDC state / nonce failures occurring
 * between the authorization redirect and the callback handling.
 *
 * These codes let consumers react to specific failure modes without having to
 * pattern-match against error message strings.
 */
export const OidcStateErrorCode = {
  /** No state was found in storage when handling the callback. */
  STATE_MISSING: 'STATE_MISSING',
  /** The state returned by the server does not match the stored one. */
  STATE_MISMATCH: 'STATE_MISMATCH',
  /** No nonce was found in storage when handling the callback / renewal. */
  NONCE_MISSING: 'NONCE_MISSING',
} as const;

// Companion type that mirrors the const above. This is the standard TS
// "string-enum-like" pattern; we intentionally reuse the same name so that
// `OidcStateErrorCode` works as both a value namespace and a type for
// consumers.
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type OidcStateErrorCode = (typeof OidcStateErrorCode)[keyof typeof OidcStateErrorCode];

/**
 * Typed error thrown when the OIDC login state or nonce is missing,
 * corrupted, or does not match the value returned by the authorization server.
 *
 * Consumers can use `instanceof OidcStateError` and inspect `code` instead of
 * relying on the (unstable) error message text.
 */
export class OidcStateError extends Error {
  readonly code: OidcStateErrorCode;

  constructor(code: OidcStateErrorCode, message: string) {
    super(message);
    this.name = 'OidcStateError';
    this.code = code;

    // Keep prototype chain intact when transpiled to ES5.
    Object.setPrototypeOf(this, OidcStateError.prototype);
  }
}

/**
 * Type guard for {@link OidcStateError}. Useful in callers that want to react
 * specifically to state/nonce failures.
 */
export const isOidcStateError = (value: unknown): value is OidcStateError => {
  return value instanceof OidcStateError;
};
