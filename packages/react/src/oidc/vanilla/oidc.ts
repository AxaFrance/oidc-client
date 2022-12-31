import {
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    DefaultCrypto,
    FetchRequestor,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    RedirectRequestHandler,
    TokenRequest,
} from '@openid/appauth';
import { AuthorizationServiceConfigurationJson } from '@openid/appauth/src/authorization_service_configuration';

import { getFromCache, setCache } from './cache';
import { CheckSessionIFrame } from './checkSessionIFrame';
import { initSession } from './initSession';
import { initWorkerAsync, sleepAsync } from './initWorker';
import { MemoryStorageBackend } from './memoryStorageBackend';
import { HashQueryStringUtils, NoHashQueryStringUtils } from './noHashQueryStringUtils';
import {
    computeTimeLeft,
    isTokensOidcValid,
    isTokensValid,
    parseOriginalTokens,
    setTokens, TokenRenewMode,
    Tokens,
} from './parseTokens';
import { getParseQueryStringFromLocation } from './route-utils';
import timer from './timer';

const TOKEN_TYPE = {
    refresh_token: 'refresh_token',
    access_token: 'access_token',
};

const performRevocationRequestAsync = async (url, token, token_type = TOKEN_TYPE.refresh_token, client_id, timeoutMs = 10000) => {
    const details = {
        token,
        token_type_hint: token_type,
        client_id,
    };

    const formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false };
    }
    return {
        success: true,
    };
};

const performTokenRequestAsync = async (url, details, extras, oldTokens, tokenRenewMode: string, timeoutMs = 10000) => {
    for (const [key, value] of Object.entries(extras)) {
        if (details[key] === undefined) {
            details[key] = value;
        }
    }

    const formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    const tokens = await response.json();
    return {
        success: true,
        data: parseOriginalTokens(tokens, oldTokens, tokenRenewMode),
    };
};

const internalFetch = async (url, headers, numberRetry = 0, timeoutMs = 10000) => {
    let response;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeoutMs);
        response = await fetch(url, { ...headers, signal: controller.signal });
    } catch (e) {
        if (e.message === 'AbortError' ||
            e.message === 'Network request failed') {
            if (numberRetry <= 1) {
                return await internalFetch(url, headers, numberRetry + 1, timeoutMs);
            } else {
                throw e;
            }
        } else {
            console.error(e.message);
            throw e; // rethrow other unexpected errors
        }
    }
    return response;
};

const randomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

export interface OidcAuthorizationServiceConfigurationJson extends AuthorizationServiceConfigurationJson{
    check_session_iframe?: string;
    issuer:string;
}

export class OidcAuthorizationServiceConfiguration extends AuthorizationServiceConfiguration {
    private check_session_iframe: string;
    private issuer: string;

    constructor(request: any) {
        super(request);
        this.authorizationEndpoint = request.authorization_endpoint;
        this.tokenEndpoint = request.token_endpoint;
        this.revocationEndpoint = request.revocation_endpoint;
        this.userInfoEndpoint = request.userinfo_endpoint;
        this.check_session_iframe = request.check_session_iframe;
        this.issuer = request.issuer;
    }
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
     extras?:StringMap;
     token_request_extras?:StringMap;
     storage?: Storage;
     monitor_session?: boolean;
     token_renew_mode?: string;
};

const oidcDatabase = {};
const oidcFactory = (configuration: OidcConfiguration, name = 'default') => {
    if (oidcDatabase[name]) {
        return oidcDatabase[name];
    }
    oidcDatabase[name] = new Oidc(configuration, name);
    return oidcDatabase[name];
};
export type LoginCallback = {
    callbackPath:string;
}

export type InternalLoginCallback = {
    callbackPath:string;
    parsedTokens:Tokens;
}

const loginCallbackWithAutoTokensRenewAsync = async (oidc) : Promise<LoginCallback> => {
    const { parsedTokens, callbackPath } = await oidc.loginCallbackAsync();
    oidc.timeoutId = autoRenewTokens(oidc, parsedTokens.refreshToken, parsedTokens.expiresAt);
    return { callbackPath };
};

async function renewTokensAndStartTimerAsync(oidc, refreshToken, forceRefresh = false, extras:StringMap = null) {
    const updateTokens = (tokens) => { oidc.tokens = tokens; };
    const { tokens, status } = await oidc.synchroniseTokensAsync(refreshToken, 0, forceRefresh, extras, updateTokens);

    const serviceWorker = await initWorkerAsync(oidc.configuration.service_worker_relative_url, oidc.configurationName, oidc.configuration.redirect_uri);
    if (!serviceWorker) {
        const session = initSession(oidc.configurationName, oidc.configuration.redirect_uri, oidc.configuration.storage);
        await session.setTokens(oidc.tokens);
    }

    if (!oidc.tokens) {
        await oidc.destroyAsync(status);
        return;
    }

    if (oidc.timeoutId) {
        oidc.timeoutId = autoRenewTokens(oidc, tokens.refreshToken, oidc.tokens.expiresAt, extras);
    }
}

const autoRenewTokens = (oidc, refreshToken, expiresAt, extras:StringMap = null) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second;
    return timer.setTimeout(async () => {
        const timeLeft = computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt);
        const timeInfo = { timeLeft };
        oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
        await renewTokensAndStartTimerAsync(oidc, refreshToken, false, extras);
    }, 1000);
};

const userInfoAsync = async (oidc) => {
    if (oidc.userInfo != null) {
        return oidc.userInfo;
    }
    if (!oidc.tokens) {
        return null;
    }
    const accessToken = oidc.tokens.accessToken;
    if (!accessToken) {
        return null;
    }

    // We wait the synchronisation before making a request
    while (oidc.tokens && !isTokensValid(oidc.tokens)) {
        await sleepAsync(200);
    }

   const oidcServerConfiguration = await oidc.initAsync(oidc.configuration.authority, oidc.configuration.authority_configuration);
   const url = oidcServerConfiguration.userInfoEndpoint;
   const fetchUserInfo = async (accessToken) => {
       const res = await fetch(url, {
           headers: {
               authorization: `Bearer ${accessToken}`,
           },
       });

       if (res.status !== 200) {
           return null;
       }

       return res.json();
   };
   const userInfo = await fetchUserInfo(accessToken);
   oidc.userInfo = userInfo;
   return userInfo;
};

const eventNames = {
    service_worker_not_supported_by_browser: 'service_worker_not_supported_by_browser',
    token_aquired: 'token_aquired',
    logout_from_another_tab: 'logout_from_another_tab',
    logout_from_same_tab: 'logout_from_same_tab',
    token_renewed: 'token_renewed',
    token_timer: 'token_timer',
    loginAsync_begin: 'loginAsync_begin',
    loginAsync_error: 'loginAsync_error',
    loginCallbackAsync_begin: 'loginCallbackAsync_begin',
    loginCallbackAsync_end: 'loginCallbackAsync_end',
    loginCallbackAsync_error: 'loginCallbackAsync_error',
    refreshTokensAsync_begin: 'refreshTokensAsync_begin',
    refreshTokensAsync: 'refreshTokensAsync',
    refreshTokensAsync_end: 'refreshTokensAsync_end',
    refreshTokensAsync_error: 'refreshTokensAsync_error',
    refreshTokensAsync_silent_error: 'refreshTokensAsync_silent_error',
    tryKeepExistingSessionAsync_begin: 'tryKeepExistingSessionAsync_begin',
    tryKeepExistingSessionAsync_end: 'tryKeepExistingSessionAsync_end',
    tryKeepExistingSessionAsync_error: 'tryKeepExistingSessionAsync_error',
    silentLoginAsync_begin: 'silentLoginAsync_begin',
    silentLoginAsync: 'silentLoginAsync',
    silentLoginAsync_end: 'silentLoginAsync_end',
    silentLoginAsync_error: 'silentLoginAsync_error',
    syncTokensAsync_begin: 'syncTokensAsync_begin',
    syncTokensAsync_end: 'syncTokensAsync_end',
    syncTokensAsync_error: 'syncTokensAsync_error',
};

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};

const oneHourSecond = 60 * 60;
const fetchFromIssuer = async (openIdIssuerUrl: string, timeCacheSecond = oneHourSecond, storage = window.sessionStorage):
    Promise<OidcAuthorizationServiceConfiguration> => {
    const fullUrl = `${openIdIssuerUrl}/.well-known/openid-configuration`;

    const localStorageKey = `oidc.server:${openIdIssuerUrl}`;
    const data = getFromCache(localStorageKey, storage, timeCacheSecond);
    if (data) {
        return new OidcAuthorizationServiceConfiguration(data);
    }
    const response = await fetch(fullUrl);

    if (response.status !== 200) {
        return null;
    }

    const result = await response.json();

    setCache(localStorageKey, result, storage);
    return new OidcAuthorizationServiceConfiguration(result);
};

export class Oidc {
    public configuration: OidcConfiguration;
    public userInfo: null;
    public tokens?: Tokens;
    public events: Array<any>;
    private timeoutId: NodeJS.Timeout;
    private configurationName: string;
    private checkSessionIFrame: CheckSessionIFrame;
    constructor(configuration:OidcConfiguration, configurationName = 'default') {
      let silent_login_uri = configuration.silent_login_uri;
      if (configuration.silent_redirect_uri && !configuration.silent_login_uri) {
          silent_login_uri = `${configuration.silent_redirect_uri.replace('-callback', '').replace('callback', '')}-login`;
      }
      this.configuration = {
          ...configuration,
          silent_login_uri,
          monitor_session: configuration.monitor_session ?? false,
          refresh_time_before_tokens_expiration_in_second: configuration.refresh_time_before_tokens_expiration_in_second ?? 60,
          silent_login_timeout: configuration.silent_login_timeout ?? 12000,
          token_renew_mode: configuration.token_renew_mode ?? TokenRenewMode.access_token_or_id_token_invalid,
      };
      this.configurationName = configurationName;
      this.tokens = null;
      this.userInfo = null;
      this.events = [];
      this.timeoutId = null;
      this.synchroniseTokensAsync.bind(this);
      this.loginCallbackWithAutoTokensRenewAsync.bind(this);
      this.initAsync.bind(this);
      this.loginCallbackAsync.bind(this);
      this._loginCallbackAsync.bind(this);
      this.subscribeEvents.bind(this);
      this.removeEventSubscription.bind(this);
      this.publishEvent.bind(this);
      this.destroyAsync.bind(this);
      this.logoutAsync.bind(this);
      this.renewTokensAsync.bind(this);
      this.initAsync(this.configuration.authority, this.configuration.authority_configuration);
    }

    subscribeEvents(func):string {
        const id = getRandomInt(9999999999999).toString();
        this.events.push({ id, func });
        return id;
    }

    removeEventSubscription(id) :void {
       const newEvents = this.events.filter(e => e.id !== id);
       this.events = newEvents;
    }

    publishEvent(eventName, data) {
        this.events.forEach(event => {
            event.func(eventName, data);
        });
    }

    static getOrCreate(configuration, name = 'default') {
        return oidcFactory(configuration, name);
    }

    static get(name = 'default') {
        const isInsideBrowser = (typeof process === 'undefined');
        if (!Object.prototype.hasOwnProperty.call(oidcDatabase, name) && isInsideBrowser) {
            throw Error(`OIDC library does seem initialized.
Please checkout that you are using OIDC hook inside a <OidcProvider configurationName="${name}"></OidcProvider> compoment.`);
        }
        return oidcDatabase[name];
    }

    static eventNames = eventNames;

    _silentLoginCallbackFromIFrame() {
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            window.top.postMessage(`${this.configurationName}_oidc_tokens:${JSON.stringify({ tokens: this.tokens, sessionState: queryParams.session_state })}`, window.location.origin);
        }
    }

    _silentLoginErrorCallbackFromIFrame() {
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            window.top.postMessage(`${this.configurationName}_oidc_error:${JSON.stringify({ error: queryParams.error })}`, window.location.origin);
        }
    }

    async silentLoginCallbackAsync() {
        try {
            await this.loginCallbackAsync(true);
            this._silentLoginCallbackFromIFrame();
        } catch (error) {
            console.error(error);
            this._silentLoginErrorCallbackFromIFrame();
        }
    }

    async silentLoginAsync(extras:StringMap = null, state:string = null, scope:string = null) {
        if (!this.configuration.silent_redirect_uri || !this.configuration.silent_login_uri) {
            return Promise.resolve(null);
        }

        try {
            this.publishEvent(eventNames.silentLoginAsync_begin, {});
            const configuration = this.configuration;
            let queries = '';

            if (state) {
                if (extras == null) {
                    extras = {};
                }
                extras.state = state;
            }

            if (scope) {
                if (extras == null) {
                    extras = {};
                }
                extras.scope = scope;
            }

            if (extras != null) {
                for (const [key, value] of Object.entries(extras)) {
                    if (queries === '') {
                      queries = `?${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                    } else {
                        queries += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                    }
                }
            }
            const link = configuration.silent_login_uri + queries;
            const idx = link.indexOf('/', link.indexOf('//') + 2);
            const iFrameOrigin = link.substr(0, idx);
            const iframe = document.createElement('iframe');
            iframe.width = '0px';
            iframe.height = '0px';

            iframe.id = `${this.configurationName}_oidc_iframe`;
            iframe.setAttribute('src', link);
            document.body.appendChild(iframe);
            return new Promise((resolve, reject) => {
                try {
                    let isResolved = false;
                    window.onmessage = (e: MessageEvent<any>) => {
                        if (e.origin === iFrameOrigin &&
                            e.source === iframe.contentWindow
                        ) {
                            const key = `${this.configurationName}_oidc_tokens:`;
                            const key_error = `${this.configurationName}_oidc_error:`;
                            const data = e.data;
                            if (data && typeof (data) === 'string') {
                                if (!isResolved) {
                                    if (data.startsWith(key)) {
                                        const result = JSON.parse(e.data.replace(key, ''));
                                        this.publishEvent(eventNames.silentLoginAsync_end, {});
                                        iframe.remove();
                                        isResolved = true;
                                        resolve(result);
                                    } else if (data.startsWith(key_error)) {
                                        const result = JSON.parse(e.data.replace(key_error, ''));
                                        this.publishEvent(eventNames.silentLoginAsync_error, result);
                                        iframe.remove();
                                        isResolved = true;
                                        reject(new Error('oidc_' + result.error));
                                    }
                                }
                            }
                        }
                    };
                    const silentSigninTimeout = configuration.silent_login_timeout;
                    setTimeout(() => {
                        if (!isResolved) {
                            this.publishEvent(eventNames.silentLoginAsync_error, { reason: 'timeout' });
                            iframe.remove();
                            isResolved = true;
                            reject(new Error('timeout'));
                        }
                    }, silentSigninTimeout);
                } catch (e) {
                    iframe.remove();
                    this.publishEvent(eventNames.silentLoginAsync_error, e);
                    reject(e);
                }
            });
        } catch (e) {
            this.publishEvent(eventNames.silentLoginAsync_error, e);
            throw e;
        }
    }

    initPromise = null;
    async initAsync(authority:string, authorityConfiguration:AuthorityConfiguration) {
        if (this.initPromise !== null) {
            return this.initPromise;
        }
        const localFuncAsync = async () => {
            if (authorityConfiguration != null) {
                return new OidcAuthorizationServiceConfiguration({
                    authorization_endpoint: authorityConfiguration.authorization_endpoint,
                    end_session_endpoint: authorityConfiguration.end_session_endpoint,
                    revocation_endpoint: authorityConfiguration.revocation_endpoint,
                    token_endpoint: authorityConfiguration.token_endpoint,
                    userinfo_endpoint: authorityConfiguration.userinfo_endpoint,
                    check_session_iframe: authorityConfiguration.check_session_iframe,
                    issuer: authorityConfiguration.issuer,
                });
            }

            const serviceWorker = await initWorkerAsync(this.configuration.service_worker_relative_url, this.configurationName, this.configuration.redirect_uri);
            const storage = serviceWorker ? window.localStorage : null;
            return await fetchFromIssuer(authority, this.configuration.authority_time_cache_wellknowurl_in_second ?? 60 * 60, storage);
        };
        this.initPromise = localFuncAsync();
        return this.initPromise.then((result) => {
            this.initPromise = null;
            return result;
        });
    }

    tryKeepExistingSessionPromise = null;
    async tryKeepExistingSessionAsync() :Promise<boolean> {
        if (this.tryKeepExistingSessionPromise !== null) {
            return this.tryKeepExistingSessionPromise;
        }
        const funcAsync = async () => {
            let serviceWorker;
            if (this.tokens != null) {
                return false;
            }
            this.publishEvent(eventNames.tryKeepExistingSessionAsync_begin, {});
            try {
                const configuration = this.configuration;
                const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
                serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName, configuration.redirect_uri);
                if (serviceWorker) {
                    const { tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'tryKeepExistingSessionAsync', configuration);
                    if (tokens) {
                        serviceWorker.startKeepAliveServiceWorker();
                        // @ts-ignore
                        this.tokens = tokens;
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, this.tokens.refreshToken, this.tokens.expiresAt);
                        const sessionState = await serviceWorker.getSessionStateAsync();
                        // @ts-ignore
                        await this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, configuration.client_id, sessionState);
                        this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                            success: true,
                            message: 'tokens inside ServiceWorker are valid',
                        });
                        return true;
                    }
                    this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                        success: false,
                        message: 'no exiting session found',
                    });
                } else {
                    if (configuration.service_worker_relative_url) {
                        this.publishEvent(eventNames.service_worker_not_supported_by_browser, {
                            message: 'service worker is not supported by this browser',
                        });
                    }
                    const session = initSession(this.configurationName, configuration.redirect_uri, configuration.storage ?? sessionStorage);
                    const { tokens } = await session.initAsync();
                    if (tokens) {
                        // @ts-ignore
                        this.tokens = setTokens(tokens, null, configuration.token_renew_mode);
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, tokens.refreshToken, this.tokens.expiresAt);
                        const sessionState = session.getSessionState();
                        // @ts-ignore
                        await this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, configuration.client_id, sessionState);
                        this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                            success: true,
                            message: 'tokens inside storage are valid',
                        });
                        return true;
                    }
                }
                this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                    success: false,
                    message: serviceWorker ? 'service worker sessions not retrieved' : 'session storage sessions not retrieved',
                });
                return false;
            } catch (exception) {
                console.error(exception);
                if (serviceWorker) {
                    await serviceWorker.clearAsync();
                }
                this.publishEvent(eventNames.tryKeepExistingSessionAsync_error, 'tokens inside ServiceWorker are invalid');
                return false;
            }
        };

        this.tryKeepExistingSessionPromise = funcAsync();
        return this.tryKeepExistingSessionPromise.then((result) => {
            this.tryKeepExistingSessionPromise = null;
            return result;
        });
    }

    loginPromise: Promise<void> = null;
    async loginAsync(callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined, silentLoginOnly = false) {
        if (this.loginPromise !== null) {
            return this.loginPromise;
        }
        const loginLocalAsync = async () => {
                const location = window.location;
                const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
                const configuration = this.configuration;
            let state;
            if (extras && 'state' in extras) {
                state = extras.state;
                delete extras.state;
            }
                if (silentLoginOnly) {
                    try {
                        const extraFinal = extras ?? configuration.extras ?? {};
                        const silentResult = await this.silentLoginAsync({
                            ...extraFinal,
                            prompt: 'none',
                        }, state, scope);

                        if (silentResult) {
                            this.tokens = silentResult.tokens;
                            this.publishEvent(eventNames.token_aquired, {});
                            // @ts-ignore
                            this.timeoutId = autoRenewTokens(this, this.tokens.refreshToken, this.tokens.expiresAt, extras);
                            return {};
                        }
                    } catch (e) {
                        return e;
                    }
                }
            this.publishEvent(eventNames.loginAsync_begin, {});

            try {
                const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
                if (!scope) {
                    scope = configuration.scope;
                }

                const extraFinal = extras ?? configuration.extras ?? {};
                if (!extraFinal.nonce) {
                    extraFinal.nonce = randomString(12);
                }
                const nonce = { nonce: extraFinal.nonce };
                const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName, this.configuration.redirect_uri);
                const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
                let storage;
                if (serviceWorker) {
                    serviceWorker.setLoginParams(this.configurationName, redirectUri, { callbackPath: url, extras, state });
                    serviceWorker.startKeepAliveServiceWorker();
                    await serviceWorker.initAsync(oidcServerConfiguration, 'loginAsync', configuration);
                    await serviceWorker.setNonceAsync(nonce);
                    storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, {});
                    await storage.setItem('dummy', {});
                } else {
                    const session = initSession(this.configurationName, redirectUri);
                    session.setLoginParams(this.configurationName, redirectUri, { callbackPath: url, extras, state });
                    await session.setNonceAsync(nonce);
                    storage = new MemoryStorageBackend(session.saveItemsAsync, {});
                }

                // @ts-ignore
                const queryStringUtil = redirectUri.includes('#') ? new HashQueryStringUtils() : new NoHashQueryStringUtils();
                const authorizationHandler = new RedirectRequestHandler(storage, queryStringUtil, window.location, new DefaultCrypto());
                const authRequest = new AuthorizationRequest({
                    client_id: configuration.client_id,
                    redirect_uri: redirectUri,
                    scope,
                    response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
                    state,
                    extras: extraFinal,
                });
                authorizationHandler.performAuthorizationRequest(oidcServerConfiguration, authRequest);
            } catch (exception) {
                this.publishEvent(eventNames.loginAsync_error, exception);
                throw exception;
            }
        };
        this.loginPromise = loginLocalAsync();
        return this.loginPromise.then(result => {
            this.loginPromise = null;
            return result;
        });
    }

    async startCheckSessionAsync(checkSessionIFrameUri, clientId, sessionState, isSilentSignin = false) {
        return new Promise<void>((resolve, reject): void => {
            if (this.configuration.silent_login_uri && this.configuration.silent_redirect_uri && this.configuration.monitor_session && checkSessionIFrameUri && sessionState && !isSilentSignin) {
                const checkSessionCallback = () => {
                    this.checkSessionIFrame.stop();

                    if (this.tokens === null) {
                        return;
                    }
                    // @ts-ignore
                    const idToken = this.tokens.idToken;
                    // @ts-ignore
                    const idTokenPayload = this.tokens.idTokenPayload;
                    this.silentLoginAsync({
                        prompt: 'none',
                        id_token_hint: idToken,
                        scope: 'openid',
                    }).then((silentSigninResponse) => {
                        const iFrameIdTokenPayload = silentSigninResponse.tokens.idTokenPayload;
                        if (idTokenPayload.sub === iFrameIdTokenPayload.sub) {
                            const sessionState = silentSigninResponse.sessionState;
                            this.checkSessionIFrame.start(silentSigninResponse.sessionState);
                            if (idTokenPayload.sid === iFrameIdTokenPayload.sid) {
                                console.debug('SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:', sessionState);
                            } else {
                                console.debug('SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:', sessionState);
                            }
                        } else {
                            console.debug('SessionMonitor._callback: Different subject signed into OP:', iFrameIdTokenPayload.sub);
                        }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    }).catch(async (e) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        for (const [key, oidc] of Object.entries(oidcDatabase)) {
                            // @ts-ignore
                            await oidc.logoutOtherTabAsync(this.configuration.client_id, idTokenPayload.sub);
                        }
                    });
                };

                this.checkSessionIFrame = new CheckSessionIFrame(checkSessionCallback, clientId, checkSessionIFrameUri);
                this.checkSessionIFrame.load().then(() => {
                    this.checkSessionIFrame.start(sessionState);
                    resolve();
                }).catch((e) => {
                    reject(e);
                });
            } else {
                resolve();
            }
        });
    }

    loginCallbackPromise : Promise<any> = null;
    async loginCallbackAsync(isSilenSignin = false) {
        if (this.loginCallbackPromise !== null) {
            return this.loginCallbackPromise;
        }

        const loginCallbackLocalAsync = async():Promise<InternalLoginCallback> => {
            const response = await this._loginCallbackAsync(isSilenSignin);
            // @ts-ignore
            const parsedTokens = response.tokens;
            // @ts-ignore
            this.tokens = response.tokens;
            const serviceWorker = await initWorkerAsync(this.configuration.service_worker_relative_url, this.configurationName, this.configuration.redirect_uri);
            if (!serviceWorker) {
                const session = initSession(this.configurationName, this.configuration.redirect_uri, this.configuration.storage);
                session.setTokens(parsedTokens);
            }
            this.publishEvent(Oidc.eventNames.token_aquired, parsedTokens);
            // @ts-ignore
            return { parsedTokens, state: response.state, callbackPath: response.callbackPath };
        };
        this.loginCallbackPromise = loginCallbackLocalAsync();
        return this.loginCallbackPromise.then(result => {
            this.loginCallbackPromise = null;
            return result;
        });
    }

    async _loginCallbackAsync(isSilentSignin = false) {
        try {
            this.publishEvent(eventNames.loginCallbackAsync_begin, {});
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
            const authority = configuration.authority;
            const tokenRequestTimeout = configuration.token_request_timeout;
            const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            const sessionState = queryParams.session_state;
            const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName, configuration.redirect_uri);
            let storage = null;
            let nonceData = null;
            if (serviceWorker) {
                serviceWorker.startKeepAliveServiceWorker();
                await serviceWorker.initAsync(oidcServerConfiguration, 'loginCallbackAsync', configuration);
                const items = await serviceWorker.loadItemsAsync();
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, items);
                const dummy = await storage.getItem('dummy');
                if (!dummy) {
                    throw new Error('Service Worker storage disapear');
                }
                await storage.removeItem('dummy');
                await serviceWorker.setSessionStateAsync(sessionState);
                nonceData = await serviceWorker.getNonceAsync();
            } else {
                const session = initSession(this.configurationName, redirectUri);
                session.setSessionState(sessionState);
                const items = await session.loadItemsAsync();
                storage = new MemoryStorageBackend(session.saveItemsAsync, items);
                nonceData = await session.getNonceAsync();
            }

            return new Promise((resolve, reject) => {
                let queryStringUtil = new NoHashQueryStringUtils();
                if (redirectUri.includes('#')) {
                    const splithash = window.location.href.split('#');
                    if (splithash.length === 2 && splithash[1].includes('?')) {
                        queryStringUtil = new HashQueryStringUtils();
                    }
                }
                const authorizationHandler = new RedirectRequestHandler(storage, queryStringUtil, window.location, new DefaultCrypto());
                const notifier = new AuthorizationNotifier();
                authorizationHandler.setAuthorizationNotifier(notifier);

                notifier.setAuthorizationListener((request, response, error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (!response) {
                        reject(new Error('no response'));
                        return;
                    }

                    let extras = null;
                    if (request && request.internal) {
                        extras = {};
                        extras.code_verifier = request.internal.code_verifier;
                        if (configuration.token_request_extras) {
                            for (const [key, value] of Object.entries(configuration.token_request_extras)) {
                                extras[key] = value;
                            }
                        }
                    }

                    const tokenRequest = new TokenRequest({
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                        code: response.code,
                        refresh_token: undefined,
                        extras,
                    });

                    let timeoutId = setTimeout(() => {
                        reject(new Error('performTokenRequest timeout'));
                        timeoutId = null;
                    }, tokenRequestTimeout ?? 12000);
                    try {
                        const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
                        tokenHandler.performTokenRequest(oidcServerConfiguration, tokenRequest).then(async (tokenResponse) => {
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                                this.timeoutId = null;
                                let loginParams = null;
                                let formattedTokens = null;
                                if (serviceWorker) {
                                    const { tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'syncTokensAsync', configuration);
                                    loginParams = serviceWorker.getLoginParams(this.configurationName, redirectUri);
                                    formattedTokens = tokens;
                                } else {
                                    const session = initSession(this.configurationName, redirectUri, configuration.storage);
                                    loginParams = session.getLoginParams(this.configurationName, redirectUri);
                                    formattedTokens = setTokens(tokenResponse, null, configuration.token_renew_mode);
                                }
                                if (!isTokensOidcValid(formattedTokens, nonceData.nonce, oidcServerConfiguration)) {
                                    const exception = new Error('Tokens are not OpenID valid');
                                    if (timeoutId) {
                                        clearTimeout(timeoutId);
                                        this.timeoutId = null;
                                        this.publishEvent(eventNames.loginCallbackAsync_error, exception);
                                        console.error(exception);
                                        reject(exception);
                                    }
                                }

                                this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, clientId, sessionState, isSilentSignin).then(() => {
                                    this.publishEvent(eventNames.loginCallbackAsync_end, {});
                                    resolve({
                                        tokens: formattedTokens,
                                        state: request.state,
                                        callbackPath: loginParams.callbackPath,
                                    });
                                });
                            }
                        });
                    } catch (exception) {
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            this.timeoutId = null;
                            this.publishEvent(eventNames.loginCallbackAsync_error, exception);
                            console.error(exception);
                            reject(exception);
                        }
                    }
                });
                authorizationHandler.completeAuthorizationRequestIfPossible();
            });
        } catch (exception) {
            console.error(exception);
            this.publishEvent(eventNames.loginCallbackAsync_error, exception);
            throw exception;
        }
    }

    async synchroniseTokensAsync(refreshToken, index = 0, forceRefresh = false, extras:StringMap = null, updateTokens) {
        while (!navigator.onLine && document.hidden) {
            await sleepAsync(1000);
            this.publishEvent(eventNames.refreshTokensAsync, { message: 'wait because navigator is offline and hidden' });
        }
        let numberTryOnline = 6;
        while (!navigator.onLine && numberTryOnline > 0) {
            await sleepAsync(1000);
            numberTryOnline--;
            this.publishEvent(eventNames.refreshTokensAsync, { message: `wait because navigator is offline try ${numberTryOnline}` });
        }
        let numberTryHidden = Math.floor(Math.random() * 15) + 10;
        while (document.hidden && numberTryHidden > 0) {
            await sleepAsync(1000);
            numberTryHidden--;
            this.publishEvent(eventNames.refreshTokensAsync, { message: `wait because navigator is hidden try ${numberTryHidden}` });
        }
        const isDocumentHidden = document.hidden;
        const nextIndex = isDocumentHidden ? index : index + 1;
        if (!extras) {
            extras = {};
        }
        const configuration = this.configuration;
        const localsilentLoginAsync = async () => {
            try {
                let loginParams = null;
                const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName, configuration.redirect_uri);
                if (serviceWorker) {
                    loginParams = serviceWorker.getLoginParams(this.configurationName, configuration.redirect_uri);
                } else {
                    const session = initSession(this.configurationName, configuration.redirect_uri, configuration.storage);
                    loginParams = session.getLoginParams(this.configurationName, configuration.redirect_uri);
                }
                const silent_token_response = await this.silentLoginAsync({
                    ...loginParams.extras,
                    ...extras,
                    prompt: 'none',
                }, loginParams.state);
                if (silent_token_response) {
                    updateTokens(silent_token_response.tokens);
                    this.publishEvent(Oidc.eventNames.token_renewed, {});
                    return { tokens: silent_token_response.tokens, status: 'LOGGED' };
                }
            } catch (exceptionSilent) {
                console.error(exceptionSilent);
                this.publishEvent(eventNames.refreshTokensAsync_silent_error, { message: 'exceptionSilent', exception: exceptionSilent.message });
                if (exceptionSilent && exceptionSilent.message && exceptionSilent.message.startsWith('oidc')) {
                    updateTokens(null);
                    this.publishEvent(eventNames.refreshTokensAsync_error, { message: 'refresh token silent' });
                    return { tokens: null, status: 'SESSION_LOST' };
                }
            }
            this.publishEvent(eventNames.refreshTokensAsync_error, { message: 'refresh token silent return' });
            return await this.synchroniseTokensAsync(null, nextIndex, forceRefresh, extras, updateTokens);
        };

        if (index > 4) {
            this.publishEvent(eventNames.refreshTokensAsync_error, { message: 'refresh token' });
            return { tokens: null, status: 'SESSION_LOST' };
        }
        try {
            const { status, tokens, nonce } = await this.syncTokensInfoAsync(configuration, this.configurationName, this.tokens, forceRefresh);
            switch (status) {
                case 'SESSION_LOST':
                    updateTokens(null);
                    this.publishEvent(eventNames.refreshTokensAsync_error, { message: 'refresh token session lost' });
                    return { tokens: null, status: 'SESSION_LOST' };
                case 'NOT_CONNECTED':
                    updateTokens(null);
                    return { tokens: null, status: null };
                case 'TOKENS_VALID':
                    updateTokens(tokens);
                    return { tokens, status: 'LOGGED_IN' };
                case 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID':
                    updateTokens(tokens);
                    this.publishEvent(Oidc.eventNames.token_renewed, { reason: 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID' });
                    return { tokens, status: 'LOGGED_IN' };
                case 'LOGOUT_FROM_ANOTHER_TAB':
                    updateTokens(null);
                    this.publishEvent(eventNames.logout_from_another_tab, { status: 'session syncTokensAsync' });
                    return { tokens: null, status: 'LOGGED_OUT' };
                case 'REQUIRE_SYNC_TOKENS':
                    this.publishEvent(eventNames.refreshTokensAsync_begin, { refreshToken, status, tryNumber: index });
                    return await localsilentLoginAsync();
                default: {
                    this.publishEvent(eventNames.refreshTokensAsync_begin, { refreshToken, status, tryNumber: index });
                    if (!refreshToken) {
                        return await localsilentLoginAsync();
                    }

                    const clientId = configuration.client_id;
                    const redirectUri = configuration.redirect_uri;
                    const authority = configuration.authority;
                    const tokenExtras = configuration.token_request_extras ? configuration.token_request_extras : {};
                    const finalExtras = { ...tokenExtras, ...extras };
                    const localFunctionAsync = async () => {
                        const details = {
                            client_id: clientId,
                            redirect_uri: redirectUri,
                            grant_type: GRANT_TYPE_REFRESH_TOKEN,
                            refresh_token: tokens.refreshToken,
                        };
                        const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
                        const timeoutMs = document.hidden ? 10000 : 30000 * 10;
                        const tokenResponse = await performTokenRequestAsync(oidcServerConfiguration.tokenEndpoint, details, finalExtras, tokens, configuration.token_renew_mode, timeoutMs);
                        if (tokenResponse.success) {
                            if (!isTokensOidcValid(tokenResponse.data, nonce.nonce, oidcServerConfiguration)) {
                                updateTokens(null);
                                this.publishEvent(eventNames.refreshTokensAsync_error, { message: 'refresh token return not valid tokens' });
                                return { tokens: null, status: 'SESSION_LOST' };
                            }
                            updateTokens(tokenResponse.data);
                            this.publishEvent(eventNames.refreshTokensAsync_end, { success: tokenResponse.success });
                            this.publishEvent(Oidc.eventNames.token_renewed, { reason: 'REFRESH_TOKEN' });
                            return { tokens: tokenResponse.data, status: 'LOGGED_IN' };
                        } else {
                            this.publishEvent(eventNames.refreshTokensAsync_silent_error, {
                                message: 'bad request',
                                tokenResponse,
                            });
                            return await this.synchroniseTokensAsync(refreshToken, nextIndex, forceRefresh, extras, updateTokens);
                        }
                    };
                    // const promise =
                    return await localFunctionAsync(); // executeWithTimeoutAsync(promise, 30000);
                }
            }
        } catch (exception) {
                console.error(exception);
                this.publishEvent(eventNames.refreshTokensAsync_silent_error, { message: 'exception', exception: exception.message });
                return this.synchroniseTokensAsync(refreshToken, nextIndex, forceRefresh, extras, updateTokens);
            }
     }

    async syncTokensInfoAsync(configuration, configurationName, currentTokens, forceRefresh = false) {
        // Service Worker can be killed by the browser (when it wants,for example after 10 seconds of inactivity, so we retreieve the session if it happen)
        // const configuration = this.configuration;
        const nullNonce = { nonce: null };
        if (!currentTokens) {
            return { tokens: null, status: 'NOT_CONNECTED', nonce: nullNonce };
        }
        let nonce = nullNonce;
        const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
        const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, configurationName, configuration.redirect_uri);
        if (serviceWorker) {
            const { status, tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'syncTokensAsync', configuration);
            if (status === 'LOGGED_OUT') {
                return { tokens: null, status: 'LOGOUT_FROM_ANOTHER_TAB', nonce: nullNonce };
            } else if (status === 'SESSIONS_LOST') {
                    return { tokens: null, status: 'SESSIONS_LOST', nonce: nullNonce };
            } else if (!status || !tokens) {
                return { tokens: null, status: 'REQUIRE_SYNC_TOKENS', nonce: nullNonce };
            } else if (tokens.issuedAt !== currentTokens.issuedAt) {
                const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
                const status = (timeLeft > 0) ? 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID' : 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID';
                const nonce = await serviceWorker.getNonceAsync();
                return { tokens, status, nonce };
            }
            nonce = await serviceWorker.getNonceAsync();
        } else {
            const session = initSession(configurationName, configuration.redirect_uri, configuration.storage ?? sessionStorage);
            const { tokens, status } = await session.initAsync();
            if (!tokens) {
                return { tokens: null, status: 'LOGOUT_FROM_ANOTHER_TAB', nonce: nullNonce };
            } else if (status === 'SESSIONS_LOST') {
                    return { tokens: null, status: 'SESSIONS_LOST', nonce: nullNonce };
                } else if (tokens.issuedAt !== currentTokens.issuedAt) {
                const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
                const status = (timeLeft > 0) ? 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID' : 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID';
                const nonce = await session.getNonceAsync();
                return { tokens, status, nonce };
            }
            nonce = await session.getNonceAsync();
        }

        const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, currentTokens.expiresAt);
        const status = (timeLeft > 0) ? 'TOKENS_VALID' : 'TOKENS_INVALID';
        if (forceRefresh) {
            return { tokens: currentTokens, status: 'FORCE_REFRESH', nonce };
        }
        return { tokens: currentTokens, status, nonce };
    }

    loginCallbackWithAutoTokensRenewPromise:Promise<LoginCallback> = null;
     loginCallbackWithAutoTokensRenewAsync():Promise<LoginCallback> {
         if (this.loginCallbackWithAutoTokensRenewPromise !== null) {
             return this.loginCallbackWithAutoTokensRenewPromise;
         }
         this.loginCallbackWithAutoTokensRenewPromise = loginCallbackWithAutoTokensRenewAsync(this);
         return this.loginCallbackWithAutoTokensRenewPromise.then(result => {
             this.loginCallbackWithAutoTokensRenewPromise = null;
             return result;
         });
     }

    userInfoPromise:Promise<any> = null;
     userInfoAsync() {
         if (this.userInfoPromise !== null) {
             return this.userInfoPromise;
         }
         this.userInfoPromise = userInfoAsync(this);
         return this.userInfoPromise.then(result => {
             this.userInfoPromise = null;
             return result;
         });
     }

     async renewTokensAsync (extras:StringMap = null) {
         if (!this.timeoutId) {
             return;
         }
         timer.clearTimeout(this.timeoutId);
         // @ts-ignore
         await renewTokensAndStartTimerAsync(this, this.tokens.refreshToken, true, extras);
     }

     async destroyAsync(status) {
         timer.clearTimeout(this.timeoutId);
         this.timeoutId = null;
         if (this.checkSessionIFrame) {
             this.checkSessionIFrame.stop();
         }
         const serviceWorker = await initWorkerAsync(this.configuration.service_worker_relative_url, this.configurationName, this.configuration.redirect_uri);
         if (!serviceWorker) {
             const session = initSession(this.configurationName, this.configuration.redirect_uri, this.configuration.storage);
             await session.clearAsync(status);
         } else {
             await serviceWorker.clearAsync(status);
         }
         this.tokens = null;
         this.userInfo = null;
        // this.events = [];
     }

     async logoutSameTabAsync(clientId: string, sub: any) {
         // @ts-ignore
         if (this.configuration.monitor_session && this.configuration.client_id === clientId && sub && this.tokens && this.tokens.idTokenPayload && this.tokens.idTokenPayload.sub === sub) {
             this.publishEvent(eventNames.logout_from_same_tab, { message: sub });
             await this.destroyAsync('LOGGED_OUT');
         }
     }

    async logoutOtherTabAsync(clientId: string, sub: any) {
        // @ts-ignore
        if (this.configuration.monitor_session && this.configuration.client_id === clientId && sub && this.tokens && this.tokens.idTokenPayload && this.tokens.idTokenPayload.sub === sub) {
            await this.destroyAsync('LOGGED_OUT');
            this.publishEvent(eventNames.logout_from_another_tab, { message: 'SessionMonitor', sub });
        }
    }

    async logoutAsync(callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null) {
        const configuration = this.configuration;
        const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
        if (callbackPathOrUrl && (typeof callbackPathOrUrl !== 'string')) {
            callbackPathOrUrl = undefined;
            console.warn('callbackPathOrUrl path is not a string');
        }
        const path = (callbackPathOrUrl === null || callbackPathOrUrl === undefined) ? location.pathname + (location.search || '') + (location.hash || '') : callbackPathOrUrl;
        let isUri = false;
        if (callbackPathOrUrl) {
            isUri = callbackPathOrUrl.includes('https://') || callbackPathOrUrl.includes('http://');
        }
        const url = isUri ? callbackPathOrUrl : window.location.origin + path;
        // @ts-ignore
        const idToken = this.tokens ? this.tokens.idToken : '';
        try {
            const revocationEndpoint = oidcServerConfiguration.revocationEndpoint;
            if (revocationEndpoint) {
                const promises = [];
                if (this.tokens.accessToken) {
                    const revokeAccessTokenPromise = performRevocationRequestAsync(revocationEndpoint, this.tokens.accessToken, TOKEN_TYPE.access_token, configuration.client_id);
                    promises.push(revokeAccessTokenPromise);
                }
                if (this.tokens.refreshToken) {
                    const revokeRefreshTokenPromise = performRevocationRequestAsync(revocationEndpoint, this.tokens.refreshToken, TOKEN_TYPE.refresh_token, configuration.client_id);
                    promises.push(revokeRefreshTokenPromise);
                }
                if (promises.length > 0) {
                    await Promise.all(promises);
                }
            }
        } catch (exception) {
            console.warn(exception);
        }
        // @ts-ignore
        const sub = this.tokens && this.tokens.idTokenPayload ? this.tokens.idTokenPayload.sub : null;
        await this.destroyAsync('LOGGED_OUT');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [key, oidc] of Object.entries(oidcDatabase)) {
            if (oidc !== this) {
                // @ts-ignore
                await oidc.logoutSameTabAsync(this.configuration.client_id, sub);
            }
        }

        if (oidcServerConfiguration.endSessionEndpoint) {
            if (!extras) {
                extras = {
                    id_token_hint: idToken,
                };
                if (callbackPathOrUrl !== null) {
                    extras.post_logout_redirect_uri = url;
                }
            }
            let queryString = '';
            if (extras) {
                for (const [key, value] of Object.entries(extras)) {
                    if (queryString === '') {
                        queryString += '?';
                    } else {
                        queryString += '&';
                    }
                    queryString += `${key}=${encodeURIComponent(value)}`;
                }
            }
            window.location.href = `${oidcServerConfiguration.endSessionEndpoint}${queryString}`;
        } else {
            window.location.reload();
        }
    }
  }

  export default Oidc;
