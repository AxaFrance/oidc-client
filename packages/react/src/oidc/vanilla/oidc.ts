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
    TokenRequest
} from '@openid/appauth';
import {HashQueryStringUtils, NoHashQueryStringUtils} from './noHashQueryStringUtils';
import {initWorkerAsync, sleepAsync} from './initWorker'
import {MemoryStorageBackend} from "./memoryStorageBackend";
import {initSession} from "./initSession";
import timer from './timer';

import {CheckSessionIFrame} from "./checkSessionIFrame"
import {getParseQueryStringFromLocation} from "./route-utils";
import {AuthorizationServiceConfigurationJson} from "@openid/appauth/src/authorization_service_configuration";
import {computeTimeLeft, isTokensValid, parseOriginalTokens, setTokens} from "./parseTokens";

const performTokenRequestAsync= async (url, details, extras) => {
    
    for (let [key, value] of Object.entries(extras)) {
        if (details[key] === undefined) {
            details[key] = value;
        }
    }

    let formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join("&");

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        //mode: 'cors',
        body: formBodyString,
    });
    if(response.status !== 200){
        return {success:false, status: response.status}
    }
    const tokens = await response.json();
    return { 
        success : true,
        data: parseOriginalTokens(tokens)
    };
}

const internalFetch = async (url, headers, numberRetry=0) => {
    let response;
    try {
        let controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        response = await fetch(url, {...headers, signal: controller.signal});
    } catch (e) {
        if (e.message === 'AbortError'
            || e.message === 'Network request failed') {
            if(numberRetry <=1) {
                return await internalFetch(url, headers, numberRetry + 1);
            } 
            else {
                throw e;
            }
        } else {
            console.error(e.message);
            throw e; // rethrow other unexpected errors
        }
    }
    return response;
}

export interface OidcAuthorizationServiceConfigurationJson extends AuthorizationServiceConfigurationJson{
    check_session_iframe?: string;
}

export class OidcAuthorizationServiceConfiguration extends AuthorizationServiceConfiguration{
    private check_session_iframe: string;
    
    constructor(request: any) {
        super(request);
        this.authorizationEndpoint = request.authorization_endpoint;
        this.tokenEndpoint = request.token_endpoint;
        this.revocationEndpoint = request.revocation_endpoint;
        this.userInfoEndpoint = request.userinfo_endpoint;
        this.check_session_iframe = request.check_session_iframe;
    }
    
}


export interface StringMap {
    [key: string]: string;
}

export interface loginCallbackResult {
    state: string,
    callbackPath: string,
}

export interface AuthorityConfiguration {
    authorization_endpoint: string;
    token_endpoint: string;
    revocation_endpoint: string;
    end_session_endpoint?: string;
    userinfo_endpoint?: string;
    check_session_iframe?:string;
}

 export type OidcConfiguration = {
     client_id: string,
     redirect_uri: string,
     silent_redirect_uri?:string,
     silent_login_uri?:string,
     silent_login_timeout?:number,
     scope: string,
     authority: string,
     authority_time_cache_wellknowurl_in_second?: number,
     authority_configuration?: AuthorityConfiguration,
     refresh_time_before_tokens_expiration_in_second?: number,
     token_request_timeout?: number,
     service_worker_relative_url?:string,
     service_worker_only?:boolean,
     extras?:StringMap
     token_request_extras?:StringMap,
     storage?: Storage
     monitor_session?: boolean
};

const oidcDatabase = {};
const oidcFactory = (configuration: OidcConfiguration, name="default") => {
    if(oidcDatabase[name]){
        return oidcDatabase[name];
    }
    oidcDatabase[name] = new Oidc(configuration, name)
    return oidcDatabase[name];
}

const loginCallbackWithAutoTokensRenewAsync = async (oidc) => {
    const { parsedTokens, state, callbackPath } = await oidc.loginCallbackAsync();
    oidc.timeoutId = autoRenewTokens(oidc, parsedTokens.refreshToken, parsedTokens.expiresAt)
    return { state, callbackPath };
}

const autoRenewTokens = (oidc, refreshToken, expiresAt) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second;
    return timer.setTimeout(async () => {
        const timeLeft = computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt);
        const timeInfo = { timeLeft };
        oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
            const {tokens, status} = await oidc.synchroniseTokensAsync(refreshToken);
            oidc.tokens= tokens;
            if(!oidc.serviceWorker){
                await oidc.session.setTokens(oidc.tokens);
            }
            if(!oidc.tokens){
                await oidc.destroyAsync(status);
                return;                
            }
            
            if(oidc.timeoutId) {
                oidc.timeoutId = autoRenewTokens(oidc, tokens.refreshToken, oidc.tokens.expiresAt);
            }

    }, 1000);
}

const getLoginSessionKey = (configurationName:string, redirectUri:string) => {
    return `oidc_login.${configurationName}:${redirectUri}`;
}

const setLoginParams = (configurationName:string, redirectUri:string, data) =>{
    const sessionKey = getLoginSessionKey(configurationName, redirectUri);
    getLoginParamsCache = data
    sessionStorage[sessionKey] = JSON.stringify(data);
}

let getLoginParamsCache = null;
const getLoginParams = (configurationName, redirectUri) => {
    const dataString = sessionStorage[getLoginSessionKey(configurationName, redirectUri)];
    if(!getLoginParamsCache){
        getLoginParamsCache = JSON.parse(dataString);
    }
    return getLoginParamsCache;
}

const userInfoAsync = async (oidc) => {
    if(oidc.userInfo != null){
        return oidc.userInfo;
    }
    if(!oidc.tokens){
        return null;
    }
    const accessToken = oidc.tokens.accessToken;
    if(!accessToken){
        return null;
    }
    // We wait the synchronisation before making a request
    while (oidc.tokens && !isTokensValid(oidc.tokens)){
        await sleepAsync(200);
    }
    
    const oidcServerConfiguration = await oidc.initAsync(oidc.configuration.authority, oidc.configuration.authority_configuration);
   const url = oidcServerConfiguration.userInfoEndpoint;
   const fetchUserInfo = async (accessToken) => {
       const res = await fetch(url, {
           headers: {
               authorization: `Bearer ${accessToken}`,
               // credentials: 'include'
           }
       });

       if(res.status != 200 ){
           return null;
       }

       return res.json();
   };
   const userInfo = await fetchUserInfo(accessToken);
   oidc.userInfo= userInfo;
   return userInfo;
}

const eventNames = {
    service_worker_not_supported_by_browser: "service_worker_not_supported_by_browser",
    token_aquired: "token_aquired",
    logout_from_another_tab: "logout_from_another_tab",
    logout_from_same_tab: "logout_from_same_tab",
    token_renewed: "token_renewed",
    token_timer: "token_timer",
    loginAsync_begin:"loginAsync_begin",
    loginAsync_error:"loginAsync_error",
    loginCallbackAsync_begin:"loginCallbackAsync_begin",
    loginCallbackAsync_end:"loginCallbackAsync_end",
    loginCallbackAsync_error:"loginCallbackAsync_error",
    refreshTokensAsync_begin: "refreshTokensAsync_begin",
    refreshTokensAsync: "refreshTokensAsync",
    refreshTokensAsync_end: "refreshTokensAsync_end",
    refreshTokensAsync_error: "refreshTokensAsync_error",
    refreshTokensAsync_silent_error: "refreshTokensAsync_silent_error",
    tryKeepExistingSessionAsync_begin: "tryKeepExistingSessionAsync_begin",
    tryKeepExistingSessionAsync_end: "tryKeepExistingSessionAsync_end",
    tryKeepExistingSessionAsync_error: "tryKeepExistingSessionAsync_error",
    silentLoginAsync_begin: "silentLoginAsync_begin",
    silentLoginAsync: "silentLoginAsync",
    silentLoginAsync_end: "silentLoginAsync_end",
    silentLoginAsync_error: "silentLoginAsync_error", 
    syncTokensAsync_begin: "syncTokensAsync_begin",
    syncTokensAsync_end: "syncTokensAsync_end",
    syncTokensAsync_error: "syncTokensAsync_error"
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const oneHourSecond = 60 * 60;
let fetchFromIssuerCache = {};
const fetchFromIssuer = async (openIdIssuerUrl: string, timeCacheSecond = oneHourSecond, storage= window.sessionStorage):
    Promise<OidcAuthorizationServiceConfiguration> => {
    const fullUrl = `${openIdIssuerUrl}/.well-known/openid-configuration`;
    
    const localStorageKey = `oidc.server:${openIdIssuerUrl}`;
    if(!fetchFromIssuerCache[localStorageKey]) {
        if(storage) {
            const cacheJson = storage.getItem(localStorageKey);
            if (cacheJson) {
                fetchFromIssuerCache[localStorageKey] = JSON.parse(cacheJson);
            }
        }
    }
    const oneHourMinisecond = 1000 * timeCacheSecond;
    // @ts-ignore
    if(fetchFromIssuerCache[localStorageKey] && (fetchFromIssuerCache[localStorageKey].timestamp + oneHourMinisecond) > Date.now()){
        return new OidcAuthorizationServiceConfiguration(fetchFromIssuerCache[localStorageKey].result);
    }
    const response = await fetch(fullUrl);

    if (response.status != 200) {
        return null;
    }
    
    const result = await response.json();
    
    const timestamp = Date.now();
    fetchFromIssuerCache[localStorageKey] = {result, timestamp};
    if(storage) {
        storage.setItem(localStorageKey, JSON.stringify({result, timestamp}));
    }
    return new OidcAuthorizationServiceConfiguration(result);
}

const buildQueries = (extras:StringMap) => {
    let queries = '';
    if(extras != null){
        for (let [key, value] of Object.entries(extras)) {
            if (queries === ""){
                queries = `?${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            } else {
                queries+= `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        }
    }
    return queries;
}

export class Oidc {
    public configuration: OidcConfiguration;
    public userInfo: null;
    public tokens: null;
    public events: Array<any>;
    private timeoutId: NodeJS.Timeout;
    private serviceWorker?: any;
    private configurationName: string;
    private session?: any;
    private checkSessionIFrame: CheckSessionIFrame;
    constructor(configuration:OidcConfiguration, configurationName="default") {
        let silent_login_uri = configuration.silent_login_uri;
        if(configuration.silent_redirect_uri && !configuration.silent_login_uri){
            silent_login_uri = `${configuration.silent_redirect_uri.replace("-callback", "").replace("callback", "")}-login`; 
        }
        
        this.configuration = {...configuration, 
            silent_login_uri, 
            monitor_session: configuration.monitor_session ?? true,
            refresh_time_before_tokens_expiration_in_second : configuration.refresh_time_before_tokens_expiration_in_second ?? 60,
            silent_login_timeout: configuration.silent_login_timeout ?? 12000,
        };
        this.configurationName= configurationName;
      this.tokens = null
      this.userInfo = null;
      this.events = [];
      this.timeoutId = null;
      this.serviceWorker = null;
      this.session = null;
      this.synchroniseTokensAsync.bind(this);
      this.loginCallbackWithAutoTokensRenewAsync.bind(this);
      this.initAsync.bind(this);
      this.loginCallbackAsync.bind(this);
      this._loginCallbackAsync.bind(this);
      this.subscriveEvents.bind(this);
      this.removeEventSubscription.bind(this);
      this.publishEvent.bind(this);
      this.destroyAsync.bind(this);
      this.logoutAsync.bind(this);
      
      this.initAsync(this.configuration.authority, this.configuration.authority_configuration);
    }

    subscriveEvents(func){
        const id = getRandomInt(9999999999999).toString();
        this.events.push({id, func});
        return id;
    }

    removeEventSubscription(id){
       const newEvents = this.events.filter(e =>  e.id !== id);
       this.events = newEvents;
    }

    publishEvent(eventName, data){
        this.events.forEach(event => {
            event.func(eventName, data)
        });
    }
    static getOrCreate(configuration, name="default") {
        return oidcFactory(configuration, name);
    }
    static get(name="default") {
        const insideBrowser = (typeof process === 'undefined');
        if(!oidcDatabase.hasOwnProperty(name) && insideBrowser){
            throw Error(`Oidc library does seem initialized.
Please checkout that you are using OIDC hook inside a <OidcProvider configurationName="${name}"></OidcProvider> compoment.`)
        }
        return oidcDatabase[name];
    }
    static eventNames = eventNames;
    
    _silentLoginCallbackFromIFrame(){
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            window.top.postMessage(`${this.configurationName}_oidc_tokens:${JSON.stringify({tokens:this.tokens, sessionState:queryParams.session_state})}`, window.location.origin);
        }
    }
    _silentLoginErrorCallbackFromIFrame() {
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            window.top.postMessage(`${this.configurationName}_oidc_error:${JSON.stringify({error: queryParams.error})}`, window.location.origin);
        }
    }
    
    async silentLoginCallBackAsync() {
        try {
            await this.loginCallbackAsync(true);
            this._silentLoginCallbackFromIFrame();
        } catch (error) {
            console.error(error)
            this._silentLoginErrorCallbackFromIFrame();
        }
    }
    
    async silentLoginAsync(extras:StringMap=null, state:string=null, scope:string=null) {
        if (!this.configuration.silent_redirect_uri || !this.configuration.silent_login_uri) {
            return Promise.resolve(null);
        }
            
        try {
            this.publishEvent(eventNames.silentLoginAsync_begin, {});
            const configuration = this.configuration
            let queries = "";
            
            if(state){
                if(extras == null){
                    extras = {};
                }
                extras.state = state;
            }
            
            if(scope){
                if(extras == null){
                    extras = {};
                }
                extras.scope = scope;
            }
            
            if(extras != null){
                for (let [key, value] of Object.entries(extras)) {
                    if (queries === ""){
                      queries = `?${encodeURIComponent(key)}=${encodeURIComponent(value)}`;  
                    } else {
                        queries+= `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                    }
                }
            }
            const link = configuration.silent_login_uri  + queries;
            const idx = link.indexOf("/", link.indexOf("//") + 2);
            const iFrameOrigin = link.substr(0, idx);
            const iframe = document.createElement('iframe');
            iframe.width = "0px";
            iframe.height = "0px";
            
            iframe.id = `${this.configurationName}_oidc_iframe`;
            iframe.setAttribute("src", link);
            document.body.appendChild(iframe);
            const self = this;
            return new Promise((resolve, reject) => {
                try {
                    let isResolved = false;
                    window.onmessage = function (e) {
                        if (e.origin === iFrameOrigin &&
                            e.source === iframe.contentWindow
                        ) {
                            const key = `${self.configurationName}_oidc_tokens:`;
                            const key_error = `${self.configurationName}_oidc_error:`;
                            const data = e.data;
                            if (data && typeof (data) === "string") {
                                if (!isResolved) {
                                    if(data.startsWith(key)) {
                                        const result = JSON.parse(e.data.replace(key, ''));
                                        self.publishEvent(eventNames.silentLoginAsync_end, {});
                                        iframe.remove();
                                        isResolved = true;
                                        resolve(result);
                                    }
                                    else if(data.startsWith(key_error)) {
                                        const result = JSON.parse(e.data.replace(key_error, ''));
                                        self.publishEvent(eventNames.silentLoginAsync_error, result);
                                        iframe.remove();
                                        isResolved = true;
                                        reject(new Error("oidc_"+result.error));
                                    }
                                }
                            }
                        }
                    };
                    const silentSigninTimeout = configuration.silent_login_timeout;
                    setTimeout(() => {
                        if (!isResolved) {
                            self.publishEvent(eventNames.silentLoginAsync_error, {reason: "timeout"});
                            iframe.remove();
                            isResolved = true;
                            reject(new Error("timeout"));
                        }
                    }, silentSigninTimeout);
                } catch (e) {
                    iframe.remove();
                    self.publishEvent(eventNames.silentLoginAsync_error, e);
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
        if(this.initPromise !== null){
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
                });
            }

            const serviceWorker = await initWorkerAsync(this.configuration.service_worker_relative_url, this.configurationName);
            const storage = serviceWorker ? window.localStorage : null;
            return await fetchFromIssuer(authority, this.configuration.authority_time_cache_wellknowurl_in_second ?? 60 * 60, storage);
        }
        this.initPromise = localFuncAsync();
        return this.initPromise.then((result) =>{
            this.initPromise = null;
            return result;
        })
    }

    tryKeepExistingSessionPromise = null;
    async tryKeepExistingSessionAsync() {
        if(this.tryKeepExistingSessionPromise !== null){
            return this.tryKeepExistingSessionPromise;
        }
        
        const funcAsync  =async () => {
            let serviceWorker
            if (this.tokens != null) {
                return false;
            }
            this.publishEvent(eventNames.tryKeepExistingSessionAsync_begin, {});
            try {
                const configuration = this.configuration;
                const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
                serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
                if (serviceWorker) {
                    const {tokens} = await serviceWorker.initAsync(oidcServerConfiguration, "tryKeepExistingSessionAsync");
                    if (tokens) {
                        serviceWorker.startKeepAliveServiceWorker();
                        // @ts-ignore
                        this.tokens = tokens;
                        this.serviceWorker = serviceWorker;
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, this.tokens.refreshToken, this.tokens.expiresAt);
                        const sessionState = await serviceWorker.getSessionStateAsync();
                        // @ts-ignore
                        await this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, configuration.client_id, sessionState);
                        this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                            success: true,
                            message: "tokens inside ServiceWorker are valid"
                        });
                        return true;
                    }
                    this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                        success: false,
                        message: "no exiting session found"
                    });
                } else {
                    if (configuration.service_worker_relative_url) {
                        this.publishEvent(eventNames.service_worker_not_supported_by_browser, {
                            message: "service worker is not supported by this browser"
                        });
                    }
                    const session = initSession(this.configurationName, configuration.redirect_uri, configuration.storage ?? sessionStorage);
                    const {tokens} = await session.initAsync();
                    if (tokens) {
                        // @ts-ignore
                        this.tokens = setTokens(tokens);
                        //session.setTokens(this.tokens);
                        this.session = session;
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, tokens.refreshToken, this.tokens.expiresAt);
                        const sessionState = session.getSessionState();
                        // @ts-ignore
                        await this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, configuration.client_id, sessionState);
                        this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                            success: true,
                            message: `tokens inside storage are valid`
                        });
                        return true;
                    }
                }
                this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
                    success: false,
                    message: serviceWorker ? "service worker sessions not retrieved" : "session storage sessions not retrieved"
                });
                return false;
            } catch (exception) {
                console.error(exception);
                if (serviceWorker) {
                    await serviceWorker.clearAsync();
                }
                this.publishEvent(eventNames.tryKeepExistingSessionAsync_error, "tokens inside ServiceWorker are invalid");
                return false;
            }
        }
        
        this.tryKeepExistingSessionPromise = funcAsync();
        return this.tryKeepExistingSessionPromise.then((result) => {
            this.tryKeepExistingSessionPromise =null;
            return result;
        });
    }

    loginPromise: Promise<any>=null;
    async loginAsync(callbackPath:string=undefined, extras:StringMap=null, state:string=undefined, isSilentSignin:boolean=false, scope:string=undefined) {
        if(this.loginPromise !== null){
            return this.loginPromise;
        }
        
        const loginLocalAsync=async () => {
            try {
                const location = window.location;
                const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
                this.publishEvent(eventNames.loginAsync_begin, {});
                const configuration = this.configuration;

                const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
                if (!scope) {
                    scope = configuration.scope;
                }

                setLoginParams(this.configurationName, redirectUri, {callbackPath: url, extras, state});
                
                let serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
                const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
                let storage;
                if (serviceWorker) {
                    serviceWorker.startKeepAliveServiceWorker();
                    await serviceWorker.initAsync(oidcServerConfiguration, "loginAsync");
                    storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, {});
                    await storage.setItem("dummy", {});
                } else {
                    const session = initSession(this.configurationName, redirectUri);
                    storage = new MemoryStorageBackend(session.saveItemsAsync, {});
                }

                const extraFinal = extras ?? configuration.extras ?? {};

                // @ts-ignore
                const queryStringUtil = redirectUri.includes("#") ? new HashQueryStringUtils() : new NoHashQueryStringUtils();
                const authorizationHandler = new RedirectRequestHandler(storage, queryStringUtil, window.location, new DefaultCrypto());
                const authRequest = new AuthorizationRequest({
                    client_id: configuration.client_id,
                    redirect_uri: redirectUri,
                    scope,
                    response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
                    state,
                    extras: extraFinal
                });
                authorizationHandler.performAuthorizationRequest(oidcServerConfiguration, authRequest);
            } catch (exception) {
                this.publishEvent(eventNames.loginAsync_error, exception);
                throw exception;
            }
        }
        this.loginPromise = loginLocalAsync();
        return this.loginPromise.then(result =>{
            this.loginPromise = null;
            return result;
        });
    }
    
    async startCheckSessionAsync(checkSessionIFrameUri, clientId, sessionState, isSilentSignin=false){
        return new Promise((resolve:Function, reject) => {
            if (this.configuration.silent_login_uri && this.configuration.silent_redirect_uri && this.configuration.monitor_session && checkSessionIFrameUri && sessionState && !isSilentSignin) {
                const checkSessionCallback = () => {
                    this.checkSessionIFrame.stop();
                    
                    if(this.tokens === null){
                        return;
                    }
                    // @ts-ignore
                    const idToken = this.tokens.idToken;
                    // @ts-ignore
                    const idTokenPayload = this.tokens.idTokenPayload;
                    this.silentLoginAsync({
                        prompt: "none",
                        id_token_hint: idToken,
                        scope: "openid"
                    }).then((silentSigninResponse) => {
                        const iFrameIdTokenPayload = silentSigninResponse.tokens.idTokenPayload;
                        if (idTokenPayload.sub === iFrameIdTokenPayload.sub) {
                            const sessionState = silentSigninResponse.sessionState;
                            this.checkSessionIFrame.start(silentSigninResponse.sessionState);
                            if (idTokenPayload.sid === iFrameIdTokenPayload.sid) {
                                console.debug("SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:", sessionState);
                            } else {
                                console.debug("SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:", sessionState);
                            }
                        }
                        else {
                            console.debug("SessionMonitor._callback: Different subject signed into OP:", iFrameIdTokenPayload.sub);
                        }
                    }).catch(async (e) => {
                        for (const [key, oidc] of Object.entries(oidcDatabase)) {
                            //if(oidc !== this) {
                                // @ts-ignore
                               await oidc.logoutOtherTabAsync(this.configuration.client_id, idTokenPayload.sub);
                            //}
                        }
                        //await this.destroyAsync();
                        //this.publishEvent(eventNames.logout_from_another_tab, {message : "SessionMonitor"});
                        
                    });
                };

                this.checkSessionIFrame = new CheckSessionIFrame(checkSessionCallback, clientId, checkSessionIFrameUri);
                this.checkSessionIFrame.load().then(() => {
                    this.checkSessionIFrame.start(sessionState);
                    resolve();
                }).catch((e) =>{
                    reject(e);
                });
            } else {
                resolve();
            }
        });
    }

    loginCallbackPromise : Promise<any>=null
    async loginCallbackAsync(isSilenSignin:boolean=false){
        if(this.loginCallbackPromise !== null){
            return this.loginCallbackPromise;
        }
        
        const loginCallbackLocalAsync= async( ) =>{
            const response = await this._loginCallbackAsync(isSilenSignin);
            // @ts-ignore
            const tokens = response.tokens;
            const parsedTokens = setTokens(tokens);
            this.tokens = parsedTokens;
            if(!this.serviceWorker){
                await this.session.setTokens(parsedTokens);
            }
            this.publishEvent(Oidc.eventNames.token_aquired, parsedTokens);
            // @ts-ignore
            return  { parsedTokens, state:response.state, callbackPath : response.callbackPath};
        }
        
        this.loginCallbackPromise = loginCallbackLocalAsync();
        return this.loginCallbackPromise.then(result =>{
            this.loginCallbackPromise = null;
            return result;
        })
    }
    
    async _loginCallbackAsync(isSilentSignin:boolean=false){
        try {
            this.publishEvent(eventNames.loginCallbackAsync_begin, {});
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
            const authority =  configuration.authority;
            const tokenRequestTimeout =  configuration.token_request_timeout;
            const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            const sessionState =  queryParams.session_state;
            const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
            let storage = null;
            if(serviceWorker){
                serviceWorker.startKeepAliveServiceWorker();
                this.serviceWorker = serviceWorker;
                await serviceWorker.initAsync(oidcServerConfiguration, "loginCallbackAsync");
                const items = await serviceWorker.loadItemsAsync();
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, items);
                const dummy =await storage.getItem("dummy");
                if(!dummy){
                    throw new Error("Service Worker storage disapear");
                }
                await storage.removeItem("dummy");
                await serviceWorker.setSessionStateAsync(sessionState);
            }else{
                
                this.session = initSession(this.configurationName, redirectUri, configuration.storage ?? sessionStorage);
                const session = initSession(this.configurationName, redirectUri);
                session.setSessionState(sessionState);
                const items = await session.loadItemsAsync();
                storage = new MemoryStorageBackend(session.saveItemsAsync, items);
            }
            return new Promise((resolve, reject) => {
                // @ts-ignore
                let queryStringUtil = new NoHashQueryStringUtils();
                if(redirectUri.includes("#")) {
                    const splithash = window.location.href.split("#");
                    if (splithash.length === 2 && splithash[1].includes("?")) {
                        queryStringUtil = new HashQueryStringUtils();
                    }
                }
                // @ts-ignore
                const authorizationHandler = new RedirectRequestHandler(storage, queryStringUtil, window.location , new DefaultCrypto());
                const notifier = new AuthorizationNotifier();
                authorizationHandler.setAuthorizationNotifier(notifier);

                notifier.setAuthorizationListener( (request, response, error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    if (!response) {
                        reject("no response");
                        return;
                    }

                    let extras = null;
                    if (request && request.internal) {
                        extras = {};
                        extras.code_verifier = request.internal.code_verifier;
                        if (configuration.token_request_extras) {
                            for (let [key, value] of Object.entries(configuration.token_request_extras)) {
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

                    let timeoutId = setTimeout(()=>{
                        reject("performTokenRequest timeout");
                        timeoutId=null;
                    }, tokenRequestTimeout ?? 12000);
                    try {
                        const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
                        tokenHandler.performTokenRequest(oidcServerConfiguration, tokenRequest).then(async (tokenResponse) => {
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                                this.timeoutId = null;
                                const loginParams = getLoginParams(this.configurationName, redirectUri);

                                if (serviceWorker) {
                                    const {tokens} = await serviceWorker.initAsync(oidcServerConfiguration, "syncTokensAsync");
                                    tokenResponse = tokens;
                                }

                                // @ts-ignore
                                this.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, clientId, sessionState, isSilentSignin).then(() => {
                                    this.publishEvent(eventNames.loginCallbackAsync_end, {});
                                    resolve({
                                        tokens: tokenResponse,
                                        state: request.state,
                                        callbackPath: loginParams.callbackPath,
                                    });
                                });
                            }
                        });
                    } catch (exception) {
                        if(timeoutId) {
                            clearTimeout(timeoutId);
                            this.timeoutId=null;
                            this.publishEvent(eventNames.loginCallbackAsync_error, exception);
                            console.error(exception);
                            reject(exception);
                        }
                    }
                });
                authorizationHandler.completeAuthorizationRequestIfPossible();
            });
        } catch(exception) {
            console.error(exception);
            this.publishEvent(eventNames.loginCallbackAsync_error, exception);
            throw exception;
        }
    }

    async synchroniseTokensAsync(refreshToken, index=0) {
        
            if (document.hidden) {
                await sleepAsync(1000);
                this.publishEvent(eventNames.refreshTokensAsync, {message: "wait because document is hidden"});
                return await this.synchroniseTokensAsync(refreshToken, index);
            }
            let numberTryOnline = 6;
            while (!navigator.onLine && numberTryOnline > 0) {
                await sleepAsync(1000);
                numberTryOnline--;
                this.publishEvent(eventNames.refreshTokensAsync, {message: `wait because navigator is offline try ${numberTryOnline}` });
            }

        const configuration = this.configuration;
        const localsilentLoginAsync= async () => {
            try {
                const loginParams = getLoginParams(this.configurationName, configuration.redirect_uri);
                const silent_token_response = await this.silentLoginAsync({
                    ...loginParams.extras,
                    prompt: "none"
                }, loginParams.state);
                if (silent_token_response) {
                    this.publishEvent(Oidc.eventNames.token_renewed, {});
                    return {tokens:silent_token_response.tokens, status:"LOGGED"};
                }
            } catch (exceptionSilent) {
                console.error(exceptionSilent);
                this.publishEvent(eventNames.refreshTokensAsync_silent_error, {message: "exceptionSilent" ,exception: exceptionSilent.message});
                if(exceptionSilent && exceptionSilent.message && exceptionSilent.message.startsWith("oidc")){
                    this.publishEvent(eventNames.refreshTokensAsync_error, {message: `refresh token silent` });
                    return {tokens:null, status:"SESSION_LOST"};
                } 
                await sleepAsync(1000);
                throw exceptionSilent;
            }
            this.publishEvent(eventNames.refreshTokensAsync_error, {message: `refresh token silent return` });
            return {tokens:null, status:"SESSION_LOST"};
        }
            
            if (index <=4) {
                try {
                    
                    const { status, tokens } = await this.syncTokensInfoAsync(configuration, this.configurationName, this.tokens);
                    switch (status) {
                        case "SESSION_LOST":
                            this.publishEvent(eventNames.refreshTokensAsync_error, {message: `refresh token session lost` });
                            return {tokens:null, status:"SESSION_LOST"};
                        case "NOT_CONNECTED":
                            return {tokens:null, status:null};
                        case "TOKENS_VALID":
                        case "TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID":
                            return {tokens, status:"LOGGED_IN"};
                        case "LOGOUT_FROM_ANOTHER_TAB":
                            this.publishEvent(eventNames.logout_from_another_tab, {"status": "session syncTokensAsync"});
                            return {tokens:null, status:"LOGGED_OUT"};
                        case "REQUIRE_SYNC_TOKENS":
                            this.publishEvent(eventNames.refreshTokensAsync_begin, {refreshToken:refreshToken, status, tryNumber: index});
                            return await localsilentLoginAsync();
                        default:
                            if(!refreshToken)
                            {
                                this.publishEvent(eventNames.refreshTokensAsync_begin, {refreshToken:refreshToken, tryNumber: index});
                                return await localsilentLoginAsync();
                            }
                            this.publishEvent(eventNames.refreshTokensAsync_begin, {refreshToken:refreshToken, status, tryNumber: index});
                            const clientId = configuration.client_id;
                            const redirectUri = configuration.redirect_uri;
                            const authority =  configuration.authority;
                            let extras = {};
                            if(configuration.token_request_extras) {
                                for (let [key, value] of Object.entries(configuration.token_request_extras)) {
                                    extras[key] = value;
                                }
                            }
                            const details = {
                                client_id: clientId,
                                redirect_uri: redirectUri,
                                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                                refresh_token: tokens.refreshToken,
                            };
                            const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
                            const tokenResponse = await performTokenRequestAsync(oidcServerConfiguration.tokenEndpoint, details, extras)
                            if (tokenResponse.success) {
                                this.publishEvent(eventNames.refreshTokensAsync_end, {success: tokenResponse.success});
                                this.publishEvent(Oidc.eventNames.token_renewed, {});
                                return {tokens: tokenResponse.data, status:"LOGGED_IN"};
                            } else {
                                this.publishEvent(eventNames.refreshTokensAsync_silent_error, {
                                    message: "bad request",
                                    tokenResponse: tokenResponse
                                });
                                return await this.synchroniseTokensAsync(null, index+1);
                            }
                    }
                } catch (exception) {
                    console.error(exception);
                    this.publishEvent(eventNames.refreshTokensAsync_silent_error, {message: "exception" ,exception: exception.message});
                    return this.synchroniseTokensAsync(refreshToken, index+1);
                }
            }

        this.publishEvent(eventNames.refreshTokensAsync_error, {message: `refresh token` });
        return {tokens:null, status:"SESSION_LOST"};
     }

    async syncTokensInfoAsync(configuration, configurationName, currentTokens)  {
        // Service Worker can be killed by the browser (when it wants,for example after 10 seconds of inactivity, so we retreieve the session if it happen)
        //const configuration = this.configuration;
        if (!currentTokens) {
            return { tokens : null, status: "NOT_CONNECTED"};
        }

        const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
        const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, configurationName);
        if (serviceWorker) {
            const {status, tokens} = await serviceWorker.initAsync(oidcServerConfiguration, "syncTokensAsync");
            if (status == "LOGGED_OUT") {
                return {tokens: null, status: "LOGOUT_FROM_ANOTHER_TAB"};
            }else if (status == "SESSIONS_LOST") {
                    return { tokens : null, status: "SESSIONS_LOST"};
            } else if (!status || !tokens) {
                return { tokens : null, status: "REQUIRE_SYNC_TOKENS"};
            } else if(tokens.issuedAt !== currentTokens.issuedAt) {
                const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
                const status = (timeLeft > 0) ? "TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID" : "TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID";
                return { tokens : tokens, status };
            }
        } else {
            const session = initSession(configurationName, configuration.redirect_uri, configuration.storage ?? sessionStorage);
            const {tokens, status } = await session.initAsync();
            if (!tokens) {
                return {tokens: null, status: "LOGOUT_FROM_ANOTHER_TAB"};
            } else if (status == "SESSIONS_LOST") {
                    return { tokens : null, status: "SESSIONS_LOST"};
                }
            else if(tokens.issuedAt !== currentTokens.issuedAt){
                const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
                const status = (timeLeft > 0) ? "TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID" : "TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID";
                return { tokens : tokens, status };
            }
        }

        const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, currentTokens.expiresAt);
        const status = (timeLeft > 0) ? "TOKENS_VALID" : "TOKENS_INVALID";
        return { tokens:currentTokens, status};
    }

    loginCallbackWithAutoTokensRenewPromise:Promise<loginCallbackResult> = null;
     loginCallbackWithAutoTokensRenewAsync():Promise<loginCallbackResult>{
         if(this.loginCallbackWithAutoTokensRenewPromise !== null){
             return this.loginCallbackWithAutoTokensRenewPromise;
         }
         this.loginCallbackWithAutoTokensRenewPromise = loginCallbackWithAutoTokensRenewAsync(this);
         return this.loginCallbackWithAutoTokensRenewPromise.then(result =>{
             this.loginCallbackWithAutoTokensRenewPromise = null;
             return result;
         })
     }

    userInfoPromise:Promise<any> = null;
     userInfoAsync(){
         if(this.userInfoPromise !== null){
             return this.userInfoPromise;
         }
         this.userInfoPromise = userInfoAsync(this);
         return this.userInfoPromise.then(result =>{
             this.userInfoPromise = null;
             return result;
         })
     }
     
     async destroyAsync(status) {
         timer.clearTimeout(this.timeoutId);
         this.timeoutId=null;
         if(this.checkSessionIFrame){
             this.checkSessionIFrame.stop();
         }
        if(this.serviceWorker){
            await this.serviceWorker.clearAsync(status);
        }
         if(this.session){
             await this.session.clearAsync(status);
         }
         this.tokens = null;
         this.userInfo = null;
        // this.events = [];
     }
     
     async logoutSameTabAsync(clientId, sub){
         // @ts-ignore
         if(this.configuration.monitor_session&& this.configuration.client_id === clientId && sub && this.tokens && this.tokens.idTokenPayload && this.tokens.idTokenPayload.sub === sub) {
             this.publishEvent(eventNames.logout_from_same_tab, {"message": sub});
             await this.destroyAsync("LOGGED_OUT");
         }
     }

    async logoutOtherTabAsync(clientId, sub){
        // @ts-ignore
        if(this.configuration.monitor_session && this.configuration.client_id === clientId && sub && this.tokens && this.tokens.idTokenPayload && this.tokens.idTokenPayload.sub === sub) {
            await this.destroyAsync("LOGGED_OUT");
            this.publishEvent(eventNames.logout_from_another_tab, {message : "SessionMonitor", "sub": sub});
        }
    }
     
    async logoutAsync(callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null) {
        const configuration = this.configuration;
        const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
        if(callbackPathOrUrl && (typeof callbackPathOrUrl !== 'string'))
        {
            callbackPathOrUrl = undefined;
            console.warn('callbackPathOrUrl path is not a string');
        }
        const path = (callbackPathOrUrl === null || callbackPathOrUrl === undefined) ? location.pathname + (location.search || '') + (location.hash || '') : callbackPathOrUrl;
		let isUri = false;
        if(callbackPathOrUrl) {
            isUri = callbackPathOrUrl.includes("https://") || callbackPathOrUrl.includes("http://");
        }
		const url = isUri ? callbackPathOrUrl : window.location.origin + path;
        // @ts-ignore
        const idToken = this.tokens ? this.tokens.idToken : "";
        // @ts-ignore
        const sub = this.tokens && this.tokens.idTokenPayload ? this.tokens.idTokenPayload.sub : null;
        await this.destroyAsync("LOGGED_OUT");
        for (const [key, oidc] of Object.entries(oidcDatabase)) {
            if(oidc !== this) {
                // @ts-ignore
                await oidc.logoutSameTabAsync(this.configuration.client_id, sub);
            }
        }
        
        if(oidcServerConfiguration.endSessionEndpoint) {
            if(!extras){
                extras= {
                    id_token_hint: idToken
                };
                if(callbackPathOrUrl !== null){
                    extras["post_logout_redirect_uri"] = url;
                }
            }
            let queryString = "";
            if(extras){
                for (let [key, value] of Object.entries(extras)) {
                    if(queryString === "")
                    {
                        queryString += "?";
                    } else{
                        queryString += "&";
                    }
                    queryString +=`${key}=${encodeURIComponent(value)}`;
                }
            }
            window.location.href = `${oidcServerConfiguration.endSessionEndpoint}${queryString}`;
        }
        else{
            window.location.reload();
        }
    }
  }
  

  export default Oidc;
