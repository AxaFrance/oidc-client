import {startCheckSessionAsync as defaultStartCheckSessionAsync} from './checkSession.js';
import {CheckSessionIFrame} from './checkSessionIFrame.js';
import {eventNames} from './events.js';
import {initSession} from './initSession.js';
import {defaultServiceWorkerUpdateRequireCallback, initWorkerAsync, sleepAsync} from './initWorker.js';
import {defaultLoginAsync, loginCallbackAsync} from './login.js';
import {destroyAsync, logoutAsync} from './logout.js';
import {computeTimeLeft, isTokensOidcValid, setTokens, TokenRenewMode, Tokens,} from './parseTokens.js';
import {autoRenewTokens, renewTokensAndStartTimerAsync} from './renewTokens.js';
import {fetchFromIssuer, performTokenRequestAsync} from './requests.js';
import {getParseQueryStringFromLocation} from './route-utils.js';
import defaultSilentLoginAsync, {_silentLoginAsync} from './silentLogin.js';
import timer from './timer.js';
import {AuthorityConfiguration, Fetch, OidcConfiguration, StringMap} from './types.js';
import {userInfoAsync} from './user.js';
import {base64urlOfHashOfASCIIEncodingAsync} from "./crypto";
import {generateJwtDemonstratingProofOfPossessionAsync} from "./jwt";
import {ILOidcLocation, OidcLocation} from "./location";
import {activateServiceWorker} from "./initWorkerOption";



export const getFetchDefault = () => {
    return fetch;
};

export interface OidcAuthorizationServiceConfigurationJson {
    check_session_iframe?: string;
    issuer:string;
}



export class OidcAuthorizationServiceConfiguration {
    private checkSessionIframe: string;
    private issuer: string;
    private authorizationEndpoint: string;
    private tokenEndpoint: string;
    private revocationEndpoint: string;
    private userInfoEndpoint: string;
    private endSessionEndpoint: string;

    constructor(request: any) {
        this.authorizationEndpoint = request.authorization_endpoint;
        this.tokenEndpoint = request.token_endpoint;
        this.revocationEndpoint = request.revocation_endpoint;
        this.userInfoEndpoint = request.userinfo_endpoint;
        this.checkSessionIframe = request.check_session_iframe;
        this.issuer = request.issuer;
        this.endSessionEndpoint = request.end_session_endpoint;
    }
}

const oidcDatabase = {};
const oidcFactory = (getFetch : () => Fetch, location: ILOidcLocation = new OidcLocation()) => (configuration: OidcConfiguration, name = 'default') => {
    if (oidcDatabase[name]) {
        return oidcDatabase[name];
    }
    oidcDatabase[name] = new Oidc(configuration, name, getFetch, location);
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

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};

export class Oidc {
    public configuration: OidcConfiguration;
    public userInfo: null;
    public tokens?: Tokens;
    public events: Array<any>;
    private timeoutId: NodeJS.Timeout;
    public configurationName: string;
    private checkSessionIFrame: CheckSessionIFrame;
    private getFetch: () => Fetch;
    private location: ILOidcLocation;
    constructor(configuration:OidcConfiguration, configurationName = 'default', getFetch : () => Fetch, location: ILOidcLocation = new OidcLocation()) {
      let silent_login_uri = configuration.silent_login_uri;
      if (configuration.silent_redirect_uri && !configuration.silent_login_uri) {
          silent_login_uri = `${configuration.silent_redirect_uri.replace('-callback', '').replace('callback', '')}-login`;
      }
      let refresh_time_before_tokens_expiration_in_second = configuration.refresh_time_before_tokens_expiration_in_second ?? 120;
      if (refresh_time_before_tokens_expiration_in_second > 60) {
          refresh_time_before_tokens_expiration_in_second = refresh_time_before_tokens_expiration_in_second - Math.floor(Math.random() * 40);
      }
      this.location = location ?? new OidcLocation();
      const service_worker_update_require_callback = configuration.service_worker_update_require_callback ?? defaultServiceWorkerUpdateRequireCallback(this.location);
      
      this.configuration = {
          ...configuration,
          silent_login_uri,
          monitor_session: configuration.monitor_session ?? false,
          refresh_time_before_tokens_expiration_in_second,
          silent_login_timeout: configuration.silent_login_timeout ?? 12000,
          token_renew_mode: configuration.token_renew_mode ?? TokenRenewMode.access_token_or_id_token_invalid,
          demonstrating_proof_of_possession: configuration.demonstrating_proof_of_possession ?? false,
          authority_timeout_wellknowurl_in_millisecond: configuration.authority_timeout_wellknowurl_in_millisecond ?? 10000,
          logout_tokens_to_invalidate: configuration.logout_tokens_to_invalidate ?? ['access_token', 'refresh_token'],
          service_worker_update_require_callback,
          service_worker_activate: configuration.service_worker_activate ?? activateServiceWorker,
      };
      
      this.getFetch = getFetch ?? getFetchDefault;
      this.configurationName = configurationName;
      this.tokens = null;
      this.userInfo = null;
      this.events = [];
      this.timeoutId = null;
      this.synchroniseTokensAsync.bind(this);
      this.loginCallbackWithAutoTokensRenewAsync.bind(this);
      this.initAsync.bind(this);
      this.loginCallbackAsync.bind(this);
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

    static getOrCreate = (getFetch : () => Fetch, location:ILOidcLocation) => (configuration, name = 'default') => {
        return oidcFactory(getFetch, location)(configuration, name);
    };

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
            const location = this.location;
            const queryParams = getParseQueryStringFromLocation(location.getCurrentHref());
            window.parent.postMessage(`${this.configurationName}_oidc_tokens:${JSON.stringify({ tokens: this.tokens, sessionState: queryParams.session_state })}`, location.getOrigin());
        }
    }

    _silentLoginErrorCallbackFromIFrame() {
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const location = this.location;
            const queryParams = getParseQueryStringFromLocation(location.getCurrentHref());
            window.parent.postMessage(`${this.configurationName}_oidc_error:${JSON.stringify({ error: queryParams.error })}`, location.getOrigin());
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

            const serviceWorker = await initWorkerAsync(this.configuration, this.configurationName);
            const storage = serviceWorker ? window.localStorage : null;
            return await fetchFromIssuer(this.getFetch())(authority, this.configuration.authority_time_cache_wellknowurl_in_second ?? 60 * 60, storage, this.configuration.authority_timeout_wellknowurl_in_millisecond);
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
                serviceWorker = await initWorkerAsync(configuration, this.configurationName);
                if (serviceWorker) {
                    const { tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'tryKeepExistingSessionAsync', configuration);
                    if (tokens) {
                        serviceWorker.startKeepAliveServiceWorker();
                        // @ts-ignore
                        this.tokens = tokens;
                        const getLoginParams = serviceWorker.getLoginParams(this.configurationName);
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, this.tokens.refreshToken, this.tokens.expiresAt, getLoginParams.extras);
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
                    const session = initSession(this.configurationName, configuration.storage ?? sessionStorage);
                    const { tokens } = await session.initAsync();
                    if (tokens) {
                        // @ts-ignore
                        this.tokens = setTokens(tokens, null, configuration.token_renew_mode);
                        const getLoginParams = session.getLoginParams();
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, tokens.refreshToken, this.tokens.expiresAt, getLoginParams.extras);
                        const sessionState = await session.getSessionStateAsync();
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

    async startCheckSessionAsync(checkSessionIFrameUri, clientId, sessionState, isSilentSignin = false) {
        await defaultStartCheckSessionAsync(this, oidcDatabase, this.configuration)(checkSessionIFrameUri, clientId, sessionState, isSilentSignin);
    }

    loginPromise: Promise<void> = null;
    async loginAsync(callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined, silentLoginOnly = false) {
        if (this.loginPromise !== null) {
            return this.loginPromise;
        }
        if (silentLoginOnly) {
            return defaultSilentLoginAsync(window, this.configurationName, this.configuration, this.publishEvent.bind(this), this)(extras, scope);
        }
        this.loginPromise = defaultLoginAsync(this.configurationName, this.configuration, this.publishEvent.bind(this), this.initAsync.bind(this), this.location)(callbackPath, extras, isSilentSignin, scope);
        return this.loginPromise.then(result => {
            this.loginPromise = null;
            return result;
        });
    }

    loginCallbackPromise : Promise<any> = null;
    async loginCallbackAsync(isSilenSignin = false) {
        if (this.loginCallbackPromise !== null) {
            return this.loginCallbackPromise;
        }

        const loginCallbackLocalAsync = async():Promise<InternalLoginCallback> => {
            const response = await loginCallbackAsync(this)(isSilenSignin);
            // @ts-ignore
            const parsedTokens = response.tokens;
            // @ts-ignore
            this.tokens = parsedTokens;
            const serviceWorker = await initWorkerAsync(this.configuration, this.configurationName);
            if (!serviceWorker) {
                const session = initSession(this.configurationName, this.configuration.storage);
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

    async synchroniseTokensAsync(refreshToken, index = 0, forceRefresh = false, extras:StringMap = null, updateTokens) {
        while (!navigator.onLine && document.hidden) {
            await sleepAsync({milliseconds: 1000});
            this.publishEvent(eventNames.refreshTokensAsync, { message: 'wait because navigator is offline and hidden' });
        }
        let numberTryOnline = 6;
        while (!navigator.onLine && numberTryOnline > 0) {
            await sleepAsync({milliseconds: 1000});
            numberTryOnline--;
            this.publishEvent(eventNames.refreshTokensAsync, { message: `wait because navigator is offline try ${numberTryOnline}` });
        }
        const isDocumentHidden = document.hidden;
        const nextIndex = isDocumentHidden ? index : index + 1;
        if (!extras) {
            extras = {};
        }
        const configuration = this.configuration;

        const silentLoginAsync = (extras: StringMap, state:string, scope:string = null) => {
            return _silentLoginAsync(this.configurationName, this.configuration, this.publishEvent.bind(this))(extras, state, scope);
        };
        const localsilentLoginAsync = async () => {
            try {
                let loginParams;
                const serviceWorker = await initWorkerAsync(configuration, this.configurationName);
                if (serviceWorker) {
                    loginParams = serviceWorker.getLoginParams();
                } else {
                    const session = initSession(this.configurationName, configuration.storage);
                    loginParams = session.getLoginParams();
                }
                const silent_token_response = await silentLoginAsync({
                    ...loginParams.extras,
                    ...extras,
                    prompt: 'none',
                }, loginParams.state);
                if (silent_token_response) {
                    updateTokens(silent_token_response.tokens);
                    this.publishEvent(Oidc.eventNames.token_renewed, {});
                    return { tokens: silent_token_response.tokens, status: 'LOGGED' };
                }
            } catch (exceptionSilent: any) {
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
            updateTokens(null);
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
                    const finalExtras = { ...tokenExtras };

                    for (const [key, value] of Object.entries(extras)) {
                        if (key.endsWith(':token_request')) {
                            finalExtras[key.replace(':token_request', '')] = value;
                        }
                    }
                    const localFunctionAsync = async () => {
                        const details = {
                            client_id: clientId,
                            redirect_uri: redirectUri,
                            grant_type: 'refresh_token',
                            refresh_token: tokens.refreshToken,
                        };
                        const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
                        const timeoutMs = document.hidden ? 10000 : 30000 * 10;
                        const url = oidcServerConfiguration.tokenEndpoint;
                        const headersExtras = {};
                        if(configuration.demonstrating_proof_of_possession) {
                            headersExtras['DPoP'] = await this.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, 'POST');
                        }
                        const tokenResponse = await performTokenRequestAsync(this.getFetch())(url, 
                            details, 
                            finalExtras, 
                            tokens,
                            headersExtras,
                            configuration.token_renew_mode, 
                            timeoutMs);
                        
                        if (tokenResponse.success) {
                            const { isValid, reason } = isTokensOidcValid(tokenResponse.data, nonce.nonce, oidcServerConfiguration);
                            if (!isValid) {
                                updateTokens(null);
                                this.publishEvent(eventNames.refreshTokensAsync_error, { message: `refresh token return not valid tokens, reason: ${reason}` });
                                return { tokens: null, status: 'SESSION_LOST' };
                            }
                            updateTokens(tokenResponse.data);
                            if(tokenResponse.demonstratingProofOfPossessionNonce) {
                                const serviceWorker = await initWorkerAsync(configuration, this.configurationName);
                                if(serviceWorker){
                                    await serviceWorker.setDemonstratingProofOfPossessionNonce(tokenResponse.demonstratingProofOfPossessionNonce);
                                } else {
                                    const session = initSession(this.configurationName, configuration.storage);
                                    await session.setDemonstratingProofOfPossessionNonce(tokenResponse.demonstratingProofOfPossessionNonce);
                                }
                            }
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
                    return await localFunctionAsync();
                }
            }
        } catch (exception: any) {
                console.error(exception);
                this.publishEvent(eventNames.refreshTokensAsync_silent_error, { message: 'exception', exception: exception.message });
                return this.synchroniseTokensAsync(refreshToken, nextIndex, forceRefresh, extras, updateTokens);
            }
     }

    async generateDemonstrationOfProofOfPossessionAsync(accessToken:string, url:string, method:string): Promise<string> {

        const configuration = this.configuration;
        const claimsExtras = {ath: await base64urlOfHashOfASCIIEncodingAsync(accessToken),};

        const serviceWorker = await initWorkerAsync(configuration, this.configurationName);
        let demonstratingProofOfPossessionNonce:string = null;
        let jwk;
        if (serviceWorker) {
            demonstratingProofOfPossessionNonce = await serviceWorker.getDemonstratingProofOfPossessionNonce();
            jwk = await serviceWorker.getDemonstratingProofOfPossessionJwkAsync();
        } else {
            const session = initSession(this.configurationName, configuration.storage);
            jwk = await session.getDemonstratingProofOfPossessionJwkAsync();
            demonstratingProofOfPossessionNonce = await session.getDemonstratingProofOfPossessionNonce();
        }

        if (demonstratingProofOfPossessionNonce) {
            claimsExtras['nonce'] = demonstratingProofOfPossessionNonce;
        }

        return await generateJwtDemonstratingProofOfPossessionAsync(jwk, method, url, claimsExtras);
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
        const serviceWorker = await initWorkerAsync(configuration, configurationName);
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
            const session = initSession(configurationName, configuration.storage ?? sessionStorage);
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
     userInfoAsync(noCache = false) {
         if (this.userInfoPromise !== null) {
             return this.userInfoPromise;
         }
         this.userInfoPromise = userInfoAsync(this)(noCache);
         return this.userInfoPromise.then(result => {
             this.userInfoPromise = null;
             return result;
         });
     }

    renewTokensPromise:Promise<any> = null;

     async renewTokensAsync (extras:StringMap = null) {
         if (this.renewTokensPromise !== null) {
             return this.renewTokensPromise;
         }
         if (!this.timeoutId) {
             return;
         }
         timer.clearTimeout(this.timeoutId);
         // @ts-ignore
         this.renewTokensPromise = renewTokensAndStartTimerAsync(this, this.tokens.refreshToken, true, extras);
         return this.renewTokensPromise.then(result => {
             this.renewTokensPromise = null;
             return result;
         });
     }

     async destroyAsync(status) {
         return await destroyAsync(this)(status);
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

    logoutPromise:Promise<void> = null;
    async logoutAsync(callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null) {
        if (this.logoutPromise) {
            return this.logoutPromise;
        }
        this.logoutPromise = logoutAsync(this, oidcDatabase, this.getFetch(), console, this.location)(callbackPathOrUrl, extras);
        return this.logoutPromise.then(result => {
            this.logoutPromise = null;
            return result;
        });
    }
  }

  export default Oidc;
