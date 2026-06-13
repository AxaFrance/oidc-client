/**
 * Public, supported entry point for the OIDC service worker `postMessage`
 * protocol, available directly from `@axa-fr/oidc-client`.
 *
 * The same exports are also published from
 * `@axa-fr/oidc-client-service-worker/protocol`. The two modules are kept
 * deliberately in sync (and verified by a unit test) so applications that
 * depend only on `@axa-fr/oidc-client` can interact with the service worker
 * without adding a transitive dependency.
 *
 * See `packages/oidc-client-service-worker/PROTOCOL.md` for the full
 * specification.
 */

/**
 * Semver-protected version of the service worker `postMessage` protocol.
 */
export const PROTOCOL_VERSION = '1.0.0' as const;

/**
 * Every supported service worker message type. The values are also the
 * literal strings used on the wire as `MessageEventData.type` and must
 * remain stable across patch and minor versions of the protocol.
 */
export const ServiceWorkerMessageType = {
  SKIP_WAITING: 'SKIP_WAITING',
  CLAIM: 'claim',
  CLEAR: 'clear',
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

export interface ServiceWorkerMessage<TData = unknown> {
  type: ServiceWorkerMessageTypeValue | 'SKIP_WAITING' | 'claim';
  configurationName: string;
  data: TData;
  tabId?: string;
}

export interface ServiceWorkerResponse {
  configurationName?: string;
  error?: unknown;
  [key: string]: unknown;
}

/** Stable internal token placeholders – matched by the SW request handler. */
export const TOKEN_PLACEHOLDERS = {
  ACCESS_TOKEN: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  REFRESH_TOKEN: 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  NONCE_TOKEN: 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER',
  CODE_VERIFIER: 'CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER',
} as const;

export const DPOP_TOKEN_PLACEHOLDER_PREFIX = 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER' as const;

export const STORAGE_KEY_PREFIX = {
  TAB_ID: 'oidc.tabId.',
  STATE: 'oidc.state.',
  NONCE: 'oidc.nonce.',
  CODE_VERIFIER: 'oidc.code_verifier.',
  LOGIN_PARAMS: 'oidc.login.',
  SW_VERSION_MISMATCH_RELOAD: 'oidc.sw.version_mismatch_reload.',
} as const;

export const SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY =
  'oidc.sw.controllerchange_reload_count' as const;

export const buildStorageKey = (
  prefix: (typeof STORAGE_KEY_PREFIX)[keyof typeof STORAGE_KEY_PREFIX],
  configurationName: string,
): string => `${prefix}${configurationName}`;

export const buildSecuredTokenPlaceholder = (
  placeholder: (typeof TOKEN_PLACEHOLDERS)[keyof typeof TOKEN_PLACEHOLDERS],
  configurationName: string,
  tabId: string = 'default',
): string => `${placeholder}_${configurationName}#tabId=${tabId}`;

export const buildDpopSecuredPlaceholder = (
  configurationName: string,
  tabId: string = 'default',
): string => `${DPOP_TOKEN_PLACEHOLDER_PREFIX}_${configurationName}#tabId=${tabId}`;

export const isServiceWorkerMessageType = (
  value: unknown,
): value is ServiceWorkerMessageTypeValue => {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.values(ServiceWorkerMessageType).includes(value as ServiceWorkerMessageTypeValue);
};
