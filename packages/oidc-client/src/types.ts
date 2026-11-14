import type { OidcResourceConfiguration } from './protocol';

export type { OidcResourceConfiguration } from './protocol';

export type Fetch = typeof window.fetch;

/** Access-token metadata; accessToken is a placeholder when the worker hides it. */
export interface ResourceAccessToken {
  resource: string;
  issuer: string;
  clientId: string;
  configurationName: string;
  accessToken: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

/** Options for acquiring a resource-specific token. */
export interface ResourceTokenOptions {
  forceRenew?: boolean;
}

/** Options for explicitly selecting a resource in authenticated fetch. */
export interface ResourceFetchOptions {
  resource?: string;
  demonstratingProofOfPossession?: boolean;
}

/** OAuth parameters with RFC 8707 repeated resource values. */
export interface OAuthParameters {
  [key: string]: string | readonly string[];
}

export type LogoutToken = 'access_token' | 'refresh_token';

export type PushedAuthorizationRequestMode = 'disabled' | 'auto' | 'required';

export type ServiceWorkerUpdateRequireCallback = (
  registration: any,
  stopKeepAlive: () => void,
) => Promise<void>;
export type ServiceWorkerRegister = (
  serviceWorkerRelativeUrl: string,
) => Promise<ServiceWorkerRegistration>;
export type ServiceWorkerActivate = () => boolean;

export enum TokenAutomaticRenewMode {
  AutomaticBeforeTokenExpiration = 'AutomaticBeforeTokensExpiration',
  AutomaticOnlyWhenFetchExecuted = 'AutomaticOnlyWhenFetchExecuted',
}

export type OidcConfiguration = {
  client_id: string;
  redirect_uri: string;
  silent_redirect_uri?: string;
  silent_login_uri?: string;
  silent_login_timeout?: number;
  scope: string;
  resource?: string | readonly string[];
  resources?: readonly OidcResourceConfiguration[];
  authority: string;
  authority_time_cache_wellknowurl_in_second?: number;
  authority_timeout_wellknowurl_in_millisecond?: number;
  authority_configuration?: AuthorityConfiguration;
  refresh_time_before_tokens_expiration_in_second?: number;
  token_automatic_renew_mode?: TokenAutomaticRenewMode;
  token_request_timeout?: number;
  par?: PushedAuthorizationRequestMode;
  par_request_timeout?: number;
  service_worker_relative_url?: string;
  service_worker_register?: ServiceWorkerRegister;
  service_worker_keep_alive_path?: string;
  service_worker_activate?: ServiceWorkerActivate;
  service_worker_only?: boolean;
  service_worker_convert_all_requests_to_cors?: boolean;
  extras?: StringMap;
  token_request_extras?: StringMap;
  storage?: Storage;
  login_state_storage?: Storage;
  monitor_session?: boolean;
  token_renew_mode?: string;
  logout_tokens_to_invalidate?: Array<LogoutToken>;
  demonstrating_proof_of_possession?: boolean;
  demonstrating_proof_of_possession_configuration?: DemonstratingProofOfPossessionConfiguration;
  preload_user_info?: boolean;
  loading_timeout_ms?: number;
};

export interface DemonstratingProofOfPossessionConfiguration {
  generateKeyAlgorithm: RsaHashedKeyGenParams | EcKeyGenParams;
  digestAlgorithm: AlgorithmIdentifier;
  importKeyAlgorithm:
    | AlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams
    | HmacImportParams
    | AesKeyAlgorithm;
  signAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  jwtHeaderAlgorithm: string;
}

export interface StringMap {
  [key: string]: string;
}

export interface AuthorityConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint: string;
  pushed_authorization_request_endpoint?: string;
  require_pushed_authorization_requests?: boolean;
  end_session_endpoint?: string;
  userinfo_endpoint?: string;
  check_session_iframe?: string;
  issuer: string;
}
