/**
 * Public, supported entry point for the oidc-client service worker
 * `postMessage` protocol.
 *
 * See `PROTOCOL.md` (in this package) for a full description of every
 * message type, payload, response shape, storage key convention and the
 * stability guarantees that apply to those exports.
 */

import type {
  MessageData,
  MessageEventData,
  MessageEventType,
  Nonce,
  OidcConfiguration,
  OidcServerConfiguration,
  Status,
} from './types';

export type {
  MessageData,
  MessageEventData,
  MessageEventType,
  Nonce,
  OidcConfiguration,
  OidcServerConfiguration,
  Status,
};

/**
 * Semver-protected version of the service worker `postMessage` protocol.
 *
 * - The `MAJOR` component changes only on a breaking change to any of the
 *   exports in this module.
 * - The `MINOR` component changes when new (additive) message types or
 *   helpers are introduced.
 * - The `PATCH` component changes for documentation or non-behavioural
 *   tweaks.
 */
export const PROTOCOL_VERSION = '1.0.0' as const;

/**
 * Every supported service worker message type.
 *
 * The values are also the literal string used on the wire as
 * `MessageEventData.type` and must therefore remain stable across patch and
 * minor versions of the protocol.
 */
export const ServiceWorkerMessageType = {
  /** Lifecycle: tells the SW to skip the `waiting` state. */
  SKIP_WAITING: 'SKIP_WAITING',
  /** Lifecycle: asks the SW to claim the current page. */
  CLAIM: 'claim',
  /** Resets the session entry kept inside the SW for a configuration. */
  CLEAR: 'clear',
  /** Initialises a configuration entry inside the SW. */
  INIT: 'init',
  SET_STATE: 'setState',
  GET_STATE: 'getState',
  SET_CODE_VERIFIER: 'setCodeVerifier',
  GET_CODE_VERIFIER: 'getCodeVerifier',
  SET_SESSION_STATE: 'setSessionState',
  GET_SESSION_STATE: 'getSessionState',
  SET_NONCE: 'setNonce',
  GET_NONCE: 'getNonce',
  SET_DPOP_NONCE: 'setDemonstratingProofOfPossessionNonce',
  GET_DPOP_NONCE: 'getDemonstratingProofOfPossessionNonce',
  SET_DPOP_JWK: 'setDemonstratingProofOfPossessionJwk',
  GET_DPOP_JWK: 'getDemonstratingProofOfPossessionJwk',
} as const;

export type ServiceWorkerMessageTypeKey = keyof typeof ServiceWorkerMessageType;
export type ServiceWorkerMessageTypeValue =
  (typeof ServiceWorkerMessageType)[ServiceWorkerMessageTypeKey];

/**
 * Structural shape of a message sent to the service worker. The shape is
 * identical to {@link MessageEventData} but typed against the public
 * {@link ServiceWorkerMessageTypeValue} union and with optional fields where
 * the underlying SW tolerates them.
 */
export interface ServiceWorkerMessage<
  TData extends Partial<MessageData> | null = Partial<MessageData> | null,
> {
  type: ServiceWorkerMessageTypeValue | 'SKIP_WAITING' | 'claim';
  configurationName: string;
  data: TData;
  /**
   * Optional tab identifier injected by the high-level helpers. Consumers
   * sending raw messages can omit it; the SW falls back to `'default'`.
   */
  tabId?: string;
}

/**
 * Generic envelope used by every response. Each individual message type may
 * extend it with additional, well-known fields (see PROTOCOL.md).
 */
export interface ServiceWorkerResponse {
  configurationName?: string;
  /** Set by the SW when it cannot service the request. */
  error?: unknown;
  [key: string]: unknown;
}

/**
 * Stable internal token placeholders. They are returned by the service
 * worker in lieu of secret values (access/refresh tokens, nonces and code
 * verifier) so consumers never see the cleartext.
 */
export const TOKEN_PLACEHOLDERS = {
  ACCESS_TOKEN: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  REFRESH_TOKEN: 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  NONCE_TOKEN: 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER',
  CODE_VERIFIER: 'CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER',
} as const;

/** Prefix used for every DPoP placeholder returned by the SW. */
export const DPOP_TOKEN_PLACEHOLDER_PREFIX = 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER' as const;

/**
 * Browser storage key conventions used by the OIDC client when no service
 * worker is available, or as a fallback alongside the SW. They are exported
 * so external integrations can read/clean up the same entries.
 */
export const STORAGE_KEY_PREFIX = {
  /** sessionStorage – per-tab tab identifier (`oidc.tabId.<configurationName>`). */
  TAB_ID: 'oidc.tabId.',
  /** sessionStorage – `oidc.state.<configurationName>`. */
  STATE: 'oidc.state.',
  /** sessionStorage – `oidc.nonce.<configurationName>`. */
  NONCE: 'oidc.nonce.',
  /** sessionStorage – `oidc.code_verifier.<configurationName>`. */
  CODE_VERIFIER: 'oidc.code_verifier.',
  /** localStorage – `oidc.login.<configurationName>`. */
  LOGIN_PARAMS: 'oidc.login.',
  /** sessionStorage – `oidc.sw.version_mismatch_reload.<configurationName>`. */
  SW_VERSION_MISMATCH_RELOAD: 'oidc.sw.version_mismatch_reload.',
} as const;

/** sessionStorage key tracking the SW controllerchange reload counter. */
export const SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY =
  'oidc.sw.controllerchange_reload_count' as const;

/**
 * Builds a typed sessionStorage / localStorage key from one of the known
 * prefixes and a configuration name. The function is intentionally
 * single-purpose so we never lose the prefix-based stability guarantee.
 */
export const buildStorageKey = (
  prefix: (typeof STORAGE_KEY_PREFIX)[keyof typeof STORAGE_KEY_PREFIX],
  configurationName: string,
): string => `${prefix}${configurationName}`;

/**
 * Builds the stable placeholder string the SW returns instead of an
 * access/refresh/nonce/code-verifier secret. Useful for consumers that need
 * to detect whether a value comes from the SW.
 */
export const buildSecuredTokenPlaceholder = (
  placeholder: (typeof TOKEN_PLACEHOLDERS)[keyof typeof TOKEN_PLACEHOLDERS],
  configurationName: string,
  tabId: string = 'default',
): string => `${placeholder}_${configurationName}#tabId=${tabId}`;

/**
 * Builds the placeholder returned for DPoP-secured access tokens
 * (`DPOP_SECURED_BY_OIDC_SERVICE_WORKER_<config>#tabId=<tabId>`).
 */
export const buildDpopSecuredPlaceholder = (
  configurationName: string,
  tabId: string = 'default',
): string => `${DPOP_TOKEN_PLACEHOLDER_PREFIX}_${configurationName}#tabId=${tabId}`;

/**
 * Type guard returning `true` when the provided value is one of the
 * supported, public service worker message types.
 */
export const isServiceWorkerMessageType = (
  value: unknown,
): value is ServiceWorkerMessageTypeValue => {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.values(ServiceWorkerMessageType).includes(value as ServiceWorkerMessageTypeValue);
};

/**
 * Internal wire-level type, re-exported for legacy parity. New code should
 * prefer {@link ServiceWorkerMessageTypeValue}.
 *
 * @internal
 */
export type ServiceWorkerMessageEventType = MessageEventType;
