
export type OidcConfiguration = {
    client_id: string;
    redirect_uri: string;
    silent_redirect_uri?:string;
    silent_login_uri?:string;
    silent_login_timeout?:number;
    scope: string;
    authority: string;
    authority_time_cache_wellknowurl_in_second?: number;
    authority_configuration?: AuthorityConfiguration;
    refresh_time_before_tokens_expiration_in_second?: number;
    token_request_timeout?: number;
    service_worker_relative_url?:string;
    service_worker_only?:boolean;
    service_worker_convert_all_requests_to_cors?:boolean;
    extras?:StringMap;
    token_request_extras?:StringMap;
    storage?: Storage;
    monitor_session?: boolean;
    token_renew_mode?: string;
};

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
