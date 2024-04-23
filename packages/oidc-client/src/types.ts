export type Fetch = typeof window.fetch;

export type LogoutToken = 'access_token' | 'refresh_token';

export type ServiceWorkerUpdateRequireCallback = (registration:any, stopKeepAlive:Function) => Promise<void>;
export type ServiceWorkerRegister = (serviceWorkerRelativeUrl:string) => Promise<ServiceWorkerRegistration>;
export type ServiceWorkerActivate = () => boolean;

export enum TokenAutomaticRenewMode {
    AutomaticBeforeTokenExpiration = 'AutomaticBeforeTokensExpiration',
    AutomaticOnlyWhenFetchExecuted = 'AutomaticOnlyWhenFetchExecuted'
}

export type OidcConfiguration = {
    client_id: string;
    redirect_uri: string;
    silent_redirect_uri?:string;
    silent_login_uri?:string;
    silent_login_timeout?:number;
    scope: string;
    authority: string;
    authority_time_cache_wellknowurl_in_second?: number;
    authority_timeout_wellknowurl_in_millisecond?: number;
    authority_configuration?: AuthorityConfiguration;
    refresh_time_before_tokens_expiration_in_second?: number;
    token_automatic_renew_mode?: TokenAutomaticRenewMode;
    token_request_timeout?: number;
    service_worker_relative_url?:string;
    service_worker_register?:ServiceWorkerRegister;
    service_worker_keep_alive_path?:string;
    service_worker_activate?:ServiceWorkerActivate;
    service_worker_only?:boolean;
    service_worker_convert_all_requests_to_cors?:boolean;
    service_worker_update_require_callback?:ServiceWorkerUpdateRequireCallback;
    extras?:StringMap;
    token_request_extras?:StringMap;
    storage?: Storage;
    monitor_session?: boolean;
    token_renew_mode?: string;
    logout_tokens_to_invalidate?:Array<LogoutToken>;
    demonstrating_proof_of_possession?:boolean;
    demonstrating_proof_of_possession_configuration?: DemonstratingProofOfPossessionConfiguration;
    preload_user_info?:boolean;
};

export interface DemonstratingProofOfPossessionConfiguration {
    generateKeyAlgorithm:  RsaHashedKeyGenParams | EcKeyGenParams,
    digestAlgorithm: AlgorithmIdentifier,
    importKeyAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
    signAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
    jwtHeaderAlgorithm: string
}

export interface StringMap {
    [key: string]: string;
}

export interface AuthorityConfiguration {
    authorization_endpoint: string;
    token_endpoint: string;
    revocation_endpoint: string;
    end_session_endpoint?: string;
    userinfo_endpoint?: string;
    check_session_iframe?:string;
    issuer:string;
}
