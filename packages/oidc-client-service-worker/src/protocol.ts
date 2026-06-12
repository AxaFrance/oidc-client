/**
 * Public protocol module for @axa-fr/oidc-client-service-worker.
 *
 * This module exposes the service worker message protocol types and storage key
 * helpers so that consumers can interact with the SW without reverse-engineering
 * internal implementation details.
 *
 * @module @axa-fr/oidc-client-service-worker/protocol
 * @since 7.28.0
 * @stability Stable – breaking changes will follow semver (major bump).
 */

export type {
  MessageData,
  MessageEventData,
  MessageEventType,
  Nonce,
  OidcConfiguration,
  OidcServerConfiguration,
  Status,
} from './types';

/**
 * All message types accepted by the OIDC service worker via `postMessage`.
 *
 * This includes lifecycle types (`SKIP_WAITING`, `claim`) and data operations
 * (`clear`, `init`, `setState`, etc.).
 */
export const MessageTypes = {
  /** Activates a waiting service worker immediately. */
  SKIP_WAITING: 'SKIP_WAITING',
  /** Claims all open clients so the SW can intercept fetches. */
  claim: 'claim',
  /** Clears all stored tokens and resets the configuration state. */
  clear: 'clear',
  /** Initializes the SW with OIDC server and client configuration. */
  init: 'init',
  /** Sets the PKCE state parameter. */
  setState: 'setState',
  /** Retrieves the stored PKCE state parameter. */
  getState: 'getState',
  /** Sets the PKCE code verifier. */
  setCodeVerifier: 'setCodeVerifier',
  /** Retrieves the stored PKCE code verifier (as a placeholder token). */
  getCodeVerifier: 'getCodeVerifier',
  /** Sets the OIDC session state for session monitoring. */
  setSessionState: 'setSessionState',
  /** Retrieves the stored session state. */
  getSessionState: 'getSessionState',
  /** Sets the nonce used for ID token validation. */
  setNonce: 'setNonce',
  /** Retrieves the stored nonce (as a placeholder token). */
  getNonce: 'getNonce',
  /** Sets the DPoP nonce returned by the authorization server. */
  setDemonstratingProofOfPossessionNonce: 'setDemonstratingProofOfPossessionNonce',
  /** Retrieves the stored DPoP nonce. */
  getDemonstratingProofOfPossessionNonce: 'getDemonstratingProofOfPossessionNonce',
  /** Sets the DPoP JSON Web Key for proof-of-possession. */
  setDemonstratingProofOfPossessionJwk: 'setDemonstratingProofOfPossessionJwk',
  /** Retrieves the stored DPoP JSON Web Key. */
  getDemonstratingProofOfPossessionJwk: 'getDemonstratingProofOfPossessionJwk',
} as const;

/**
 * Storage key helpers for keys read/written by the OIDC service worker
 * and the client library.
 *
 * These keys are stored in `sessionStorage` (or `localStorage` for login
 * params) and are namespaced by configuration name.
 *
 * @example
 * ```ts
 * import { OidcStorageKeys } from '@axa-fr/oidc-client-service-worker/protocol';
 *
 * const tabId = sessionStorage.getItem(OidcStorageKeys.tabId('default'));
 * ```
 */
export const OidcStorageKeys = {
  /** Tab identifier used to support multi-tab login (`sessionStorage`). */
  tabId: (configurationName: string) => `oidc.tabId.${configurationName}`,
  /** Nonce for ID token validation fallback (`sessionStorage`). */
  nonce: (configurationName: string) => `oidc.nonce.${configurationName}`,
  /** PKCE state parameter fallback (`sessionStorage`). */
  state: (configurationName: string) => `oidc.state.${configurationName}`,
  /** PKCE code verifier fallback (`sessionStorage`). */
  codeVerifier: (configurationName: string) => `oidc.code_verifier.${configurationName}`,
  /** Tokens and status stored by session-based (non-SW) flow (`sessionStorage`). */
  tokens: (configurationName: string) => `oidc.${configurationName}`,
  /** User info cache (`sessionStorage`). */
  userInfo: (configurationName: string) => `oidc.${configurationName}.userInfo`,
  /** Login parameters (extras, scope, callbackPath) (`localStorage`). */
  login: (configurationName: string) => `oidc.login.${configurationName}`,
  /** Controller-change reload counter to prevent infinite loops (`sessionStorage`). */
  swReloadCount: () => `oidc.sw.controllerchange_reload_count`,
  /** Version mismatch reload counter (`sessionStorage`). */
  swVersionMismatchReload: (configurationName: string) =>
    `oidc.sw.version_mismatch_reload.${configurationName}`,
} as const;
