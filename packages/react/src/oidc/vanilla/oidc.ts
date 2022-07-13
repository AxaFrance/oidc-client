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
import {NoHashQueryStringUtils, HashQueryStringUtils} from './noHashQueryStringUtils';
import {initWorkerAsync, sleepAsync} from './initWorker'
import {MemoryStorageBackend} from "./memoryStorageBackend";
import {initSession} from "./initSession";
import timer from './timer';

import {CheckSessionIFrame} from "./checkSessionIFrame"
import {getParseQueryStringFromLocation} from "../core/routes/route-utils";
import {JQueryRequestor, Requestor} from "@openid/appauth/src/xhr";
import {AuthorizationServiceConfigurationJson} from "@openid/appauth/src/authorization_service_configuration";
import {queries} from "@testing-library/react";

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

const isInIframe = () => {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

const idTokenPayload = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

const countLetter = (str, find)=> {
    return (str.split(find)).length - 1;
}

const extractAccessTokenPayload = tokens => {
    if(tokens.accessTokenPayload)
    {
        return tokens.accessTokenPayload;
    }
    const accessToken = tokens.accessToken;
    try{
        if (!accessToken || countLetter(accessToken,'.') != 2) {
            return null;
        }
        return JSON.parse(atob(accessToken.split('.')[1]));
    } catch (e) {
        console.warn(e);
    }
    return null;
};

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
     silent_signin_timeout?:number,
     scope: string,
     authority: string,
     authority_configuration?: AuthorityConfiguration,
     refresh_time_before_tokens_expiration_in_second?: number,
     token_request_timeout?: number,
     service_worker_relative_url?:string,
     service_worker_only?:boolean,
     extras?:StringMap
     token_request_extras?:StringMap,
     storage?: Storage
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
    const response = await oidc.loginCallbackAsync();
    const tokens = response.tokens
    oidc.tokens = await setTokensAsync(oidc.serviceWorker, tokens);
    if(!oidc.serviceWorker){
        await oidc.session.setTokens(oidc.tokens);
    }
    oidc.publishEvent(Oidc.eventNames.token_aquired, oidc.tokens);
    oidc.timeoutId = autoRenewTokens(oidc, tokens.refreshToken, oidc.tokens.expiresAt)
    return { state:response.state, callbackPath : response.callbackPath };
}

const autoRenewTokens = (oidc, refreshToken, expiresAt) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second ?? 60;
    return timer.setTimeout(async () => {
        const currentTimeUnixSecond = new Date().getTime() /1000;
        const timeInfo = { timeLeft: Math.round(((expiresAt - refreshTimeBeforeTokensExpirationInSecond)- currentTimeUnixSecond))};
        oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
        if(currentTimeUnixSecond > (expiresAt - refreshTimeBeforeTokensExpirationInSecond)) {
            const tokens = await oidc.refreshTokensAsync(refreshToken);
            oidc.tokens= await setTokensAsync(oidc.serviceWorker, tokens);
            if(!oidc.serviceWorker){
                await oidc.session.setTokens(oidc.tokens);
            }
            if(!oidc.tokens){
                return;                
            }
            oidc.publishEvent(Oidc.eventNames.token_renewed, oidc.tokens);
            if(oidc.timeoutId) {
                oidc.timeoutId = autoRenewTokens(oidc, tokens.refreshToken, oidc.tokens.expiresAt);
            }
        } else{
            await oidc.syncTokensAsync();
            if(oidc.timeoutId) {
                oidc.timeoutId = autoRenewTokens(oidc, refreshToken, expiresAt);
            }
        }
    }, 1000);
}

export const getLoginParams = (configurationName) => {
    return JSON.parse(sessionStorage[`oidc_login.${configurationName}`]);
}

const userInfoAsync = async (oidc) => {
    if(oidc.userInfo != null){
        return oidc.userInfo;
    }
    if(!oidc.tokens){
        return null;
    }
    if(oidc.syncTokensAsyncPromise){
        await oidc.syncTokensAsyncPromise;
    }
    const accessToken = oidc.tokens.accessToken;

    const oidcServerConfiguration = await oidc.initAsync(oidc.configuration.authority, oidc.configuration.authority_configuration);
   const url = oidcServerConfiguration.userInfoEndpoint;
   const fetchUserInfo = async (accessToken) => {
       const res = await fetch(url, {
           headers: {
               authorization: `Bearer ${accessToken}`
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

const setTokensAsync = async (serviceWorker, tokens) =>{
    let accessTokenPayload;
    if(tokens == null){
        if(serviceWorker){
            await serviceWorker.clearAsync();
        }
        return null;
    }
    if(serviceWorker){
        accessTokenPayload = await serviceWorker.getAccessTokenPayloadAsync();
    }
    else {
        accessTokenPayload = extractAccessTokenPayload(tokens);
    }
    const expiresAt =  tokens.issuedAt + tokens.expiresIn;
    return {...tokens, idTokenPayload: idTokenPayload(tokens.idToken), accessTokenPayload, expiresAt};
}

const eventNames = {
    service_worker_not_supported_by_browser: "service_worker_not_supported_by_browser",
    token_aquired: "token_aquired",
    logout: "logout",
    token_renewed: "token_renewed",
    token_timer: "token_timer",
    loginAsync_begin:"loginAsync_begin",
    loginAsync_error:"loginAsync_error",
    loginCallbackAsync_begin:"loginCallbackAsync_begin",
    loginCallbackAsync_end:"loginCallbackAsync_end",
    loginCallbackAsync_error:"loginCallbackAsync_error",
    refreshTokensAsync_begin: "refreshTokensAsync_begin",
    refreshTokensAsync_end: "refreshTokensAsync_end",
    refreshTokensAsync_error: "refreshTokensAsync_error",
    refreshTokensAsync_silent_begin: "refreshTokensAsync_silent_begin",
    refreshTokensAsync_silent_end: "refreshTokensAsync_silent_end",
    refreshTokensAsync_silent_error: "refreshTokensAsync_silent_error",
    tryKeepExistingSessionAsync_begin: "tryKeepExistingSessionAsync_begin",
    tryKeepExistingSessionAsync_end: "tryKeepExistingSessionAsync_end",
    tryKeepExistingSessionAsync_error: "tryKeepExistingSessionAsync_error",
    silentSigninAsync_begin: "silentSigninAsync_begin",
    silentSigninAsync: "silentSigninAsync",
    silentSigninAsync_end: "silentSigninAsync_end",
    silentSigninAsync_error: "silentSigninAsync_error", 
    syncTokensAsync_begin: "syncTokensAsync_begin",
    syncTokensAsync_end: "syncTokensAsync_end",
    syncTokensAsync_error: "syncTokensAsync_error"

}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const WELL_KNOWN_PATH = '.well-known';
const OPENID_CONFIGURATION = 'openid-configuration';

const fetchFromIssuer = async (openIdIssuerUrl: string):
    Promise<OidcAuthorizationServiceConfiguration> => {
    const fullUrl = `${openIdIssuerUrl}/${WELL_KNOWN_PATH}/${OPENID_CONFIGURATION}`;

    const res = await fetch(fullUrl);

    if (res.status != 200) {
        return null;
    }

    const result = await res.json();
    return new OidcAuthorizationServiceConfiguration(result);
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
      this.configuration = configuration
        this.configurationName= configurationName;
      this.tokens = null
      this.userInfo = null;
      this.events = [];
      this.timeoutId = null;
      this.serviceWorker = null;
      this.session = null;
      this.refreshTokensAsync.bind(this);
      this.loginCallbackWithAutoTokensRenewAsync.bind(this);
      this.initAsync.bind(this);
      this.loginCallbackAsync.bind(this);
      this.subscriveEvents.bind(this);
      this.removeEventSubscription.bind(this);
      this.publishEvent.bind(this);
      this.destroyAsync.bind(this);
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
    
    silentSigninCallbackFromIFrame(){
        if (this.configuration.silent_redirect_uri) {
            const queryParams = getParseQueryStringFromLocation(window.location.href);
            window.top.postMessage(`${this.configurationName}_oidc_tokens:${JSON.stringify({tokens:this.tokens, sessionState:queryParams.session_state})}`, window.location.origin);
        }
    }
    async silentSigninAsync(extras:StringMap=null) {
        if (!this.configuration.silent_redirect_uri) {
            return Promise.resolve(null);
        }
        while (document.hidden) {
            await sleepAsync(1000);
            this.publishEvent(eventNames.silentSigninAsync, {message:"wait because document is hidden"});
        }
            
        try {
            this.publishEvent(eventNames.silentSigninAsync_begin, {});
            const configuration = this.configuration
            let queries = "";
            if(extras != null){
                for (let [key, value] of Object.entries(extras)) {
                    if (queries === ""){
                      queries = `?${encodeURIComponent(key)}=${encodeURIComponent(value)}`;  
                    } else {
                        queries+= `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                    }
                }
            }
            const link = configuration.silent_redirect_uri  + queries;
            console.log("link");
            console.log(link);
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
                        const key = `${self.configurationName}_oidc_tokens:`;
                        if (e.data && typeof (e.data) === "string" && e.data.startsWith(key)) {
                            if (!isResolved) {
                                const result = JSON.parse(e.data.replace(key, ''));
                                self.publishEvent(eventNames.silentSigninAsync_end, result);
                                iframe.remove();
                                isResolved = true;
                                resolve(result);
                            }
                        }
                    };
                    const silentSigninTimeout = configuration.silent_signin_timeout ?? 12000
                    setTimeout(() => {
                        if (!isResolved) {
                            self.publishEvent(eventNames.silentSigninAsync_error, "timeout");
                            iframe.remove();
                            isResolved = true;
                            reject("timeout");
                        }
                    }, silentSigninTimeout);
                } catch (e) {
                    iframe.remove();
                    self.publishEvent(eventNames.silentSigninAsync_error, e);
                    reject(e);
                }
            });
        } catch (e) {
            this.publishEvent(eventNames.silentSigninAsync_error, e);
            throw e;
        }
    }
    initAsyncPromise = null;
    async initAsync(authority:string, authorityConfiguration:AuthorityConfiguration) {
        if (authorityConfiguration != null) {
            return new OidcAuthorizationServiceConfiguration( {
                authorization_endpoint: authorityConfiguration.authorization_endpoint,
                end_session_endpoint: authorityConfiguration.end_session_endpoint,
                revocation_endpoint: authorityConfiguration.revocation_endpoint,
                token_endpoint: authorityConfiguration.token_endpoint,
                userinfo_endpoint: authorityConfiguration.userinfo_endpoint,
                check_session_iframe:authorityConfiguration.check_session_iframe,
            });
        }
        if(this.initAsyncPromise){
            return this.initAsyncPromise;
        }
        
        this.initAsyncPromise = await fetchFromIssuer(authority);
        return this.initAsyncPromise;
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
                        const updatedTokens = await this.refreshTokensAsync(tokens.refresh_token, true);
                        // @ts-ignore
                        this.tokens = await setTokensAsync(serviceWorker, updatedTokens);
                        this.serviceWorker = serviceWorker;
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, updatedTokens.refreshToken, this.tokens.expiresAt);
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
                    const session = initSession(this.configurationName, configuration.storage ?? sessionStorage);
                    const {tokens} = await session.initAsync();
                    if (tokens) {
                        const updatedTokens = await this.refreshTokensAsync(tokens.refreshToken, true);
                        // @ts-ignore
                        this.tokens = await setTokensAsync(serviceWorker, updatedTokens);
                        session.setTokens(this.tokens);
                        this.session = session;
                        // @ts-ignore
                        this.timeoutId = autoRenewTokens(this, updatedTokens.refreshToken, this.tokens.expiresAt);
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

    async loginAsync(callbackPath:string=undefined, extras:StringMap=null, installServiceWorker=true, state:string=undefined) {
        try {
            const location = window.location;
            const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
            this.publishEvent(eventNames.loginAsync_begin, {});
            const configuration = this.configuration
            // Security we cannot loggin from Iframe
            if (!configuration.silent_redirect_uri && isInIframe()) {
                throw new Error("Login from iframe is forbidden");
            }
            sessionStorage[`oidc_login.${this.configurationName}`] = JSON.stringify({callbackPath:url,extras,state});
            
            let serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
            const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
            if(serviceWorker && installServiceWorker) {
                const isServiceWorkerProxyActive = await serviceWorker.isServiceWorkerProxyActiveAsync();
                if(!isServiceWorkerProxyActive) {
                    window.location.href = `${configuration.redirect_uri}/service-worker-install`;
                    return;
                }
            }
            let storage;
            if(serviceWorker) {
                serviceWorker.startKeepAliveServiceWorker();
                await serviceWorker.initAsync(oidcServerConfiguration, "loginAsync");
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, {});
                await storage.setItem("dummy",{});
            } else {
                const session = initSession(this.configurationName);
                storage = new MemoryStorageBackend(session.saveItemsAsync, {});
            }
            
            const extraFinal = extras ?? configuration.extras ?? {};
            if(isInIframe()){
                extraFinal["prompt"]= "none";
                const queryParams = getParseQueryStringFromLocation(window.location.href);
                if(queryParams.session_state){
                    extraFinal.session_state = queryParams.session_state;
                }
                if(queryParams.id_token_hint)   {
                    extraFinal.id_token_hint = queryParams.id_token_hint;
                }
                
                console.log("extraFinal")
                console.log(extraFinal)
            }
            
            // @ts-ignore
            const queryStringUtil = configuration.redirect_uri.includes("#") ? new HashQueryStringUtils() : new NoHashQueryStringUtils();
            const authorizationHandler = new RedirectRequestHandler(storage, queryStringUtil, window.location, new DefaultCrypto());
                    const authRequest = new AuthorizationRequest({
                        client_id: configuration.client_id,
                        redirect_uri: configuration.redirect_uri,
                        scope: configuration.scope,
                        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
                        state,
                        extras: extraFinal
                    });
                    authorizationHandler.performAuthorizationRequest(oidcServerConfiguration, authRequest);
        } catch(exception) {
            this.publishEvent(eventNames.loginAsync_error, exception);
            throw exception;
        }
    }
    
    async loginCallbackAsync(){
        try {
            this.publishEvent(eventNames.loginCallbackAsync_begin, {});
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectURL = configuration.redirect_uri;
            const authority =  configuration.authority;
            const tokenRequestTimeout =  configuration.token_request_timeout;
            const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
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
            }else{
                
                this.session = initSession(this.configurationName, configuration.storage ?? sessionStorage);
                const session = initSession(this.configurationName);
                const items = await session.loadItemsAsync();
                storage = new MemoryStorageBackend(session.saveItemsAsync, items);
            }
            return new Promise((resolve, reject) => {
                // @ts-ignore
                let queryStringUtil = new NoHashQueryStringUtils();
                if(configuration.redirect_uri.includes("#")) {
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
                        redirect_uri: redirectURL,
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
                        tokenHandler.performTokenRequest(oidcServerConfiguration, tokenRequest).then((tokenResponse)=>{
                            if(timeoutId) {
                                clearTimeout(timeoutId);
                                this.timeoutId=null;
                                const loginParams = getLoginParams(this.configurationName);
                                const queryParams = getParseQueryStringFromLocation(window.location.href);
                                console.debug("queryParams");
                                console.debug(queryParams);
                                
                                if(oidcServerConfiguration.check_session_iframe && queryParams.session_state) {
                                    const sessionState = queryParams.session_state;
                                    const callback = () => {
                                        console.log("callback logout");
                                        
                                        const idToken = tokenResponse.idToken;
                                        this.silentSigninAsync({session_state: sessionState, id_token_hint: idToken}).then((silentSigninResponse) =>{
                                            console.log("to ckeck tokens !!!!!!!!!!!!!!");
                                            console.log(silentSigninResponse);
                                            //this.destroyAsync();
                                            this.publishEvent(eventNames.logout, {});
                                            }
                                        )
                                        
                                    };
                                    
                                    this.checkSessionIFrame = new CheckSessionIFrame(callback, configuration.client_id, oidcServerConfiguration.check_session_iframe);
                                    this.checkSessionIFrame.load().then(() => {
                                        this.checkSessionIFrame.start(queryParams.session_state);
                                        this.publishEvent(eventNames.loginCallbackAsync_end, {});
                                        resolve({
                                            tokens: tokenResponse,
                                            state: request.state,
                                            callbackPath: loginParams.callbackPath,
                                        });
                                    });
                                } else {
                                    this.publishEvent(eventNames.loginCallbackAsync_end, {});
                                    resolve({
                                        tokens: tokenResponse,
                                        state: request.state,
                                        callbackPath: loginParams.callbackPath,
                                    });
                                }
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

    async refreshTokensAsync(refreshToken, silentEvent = false) {
        const localSilentSigninAsync= async (exception=null) => {
            try {
                const silent_token_response = await this.silentSigninAsync();
                if (silent_token_response) {
                    return silent_token_response.tokens;
                }
            } catch (exceptionSilent) {
                console.error(exceptionSilent);
            }
            if(this.timeoutId){
                timer.clearTimeout(this.timeoutId);
                this.timeoutId=null;
            }
            this.publishEvent(silentEvent ? eventNames.refreshTokensAsync_silent_error : eventNames.refreshTokensAsync_error, exception);
            return null;
        }

        try{
            this.publishEvent(silentEvent ? eventNames.refreshTokensAsync_silent_begin : eventNames.refreshTokensAsync_begin, {})
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectUri = configuration.redirect_uri;
            const authority =  configuration.authority;
            
            if(!refreshToken)
            {
                return await localSilentSigninAsync();
            }
            const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());

            let extras = undefined;
            if(configuration.token_request_extras) {
                extras = {}
                for (let [key, value] of Object.entries(configuration.token_request_extras)) {
                    extras[key] = value;
                }
            }
            
            // use the token response to make a request for an access token
            const request = new TokenRequest({
                client_id: clientId,
                redirect_uri: redirectUri,
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                code: undefined,
                refresh_token: refreshToken,
                extras
                });
            
            const oidcServerConfiguration = await this.initAsync(authority, configuration.authority_configuration);
            const token_response = await tokenHandler.performTokenRequest(oidcServerConfiguration, request);
            this.publishEvent(silentEvent ? eventNames.refreshTokensAsync_silent_end :eventNames.refreshTokensAsync_end,  {message:"success"});
            return token_response;
        } catch(exception) {
            console.error(exception);
            return await localSilentSigninAsync(exception);
        }
     }

    syncTokensAsyncPromise=null;
    async syncTokensAsync() {
        // Service Worker can be killed by the browser (when it wants,for example after 10 seconds of inactivity, so we retreieve the session if it happen)
        const configuration = this.configuration;
        if(!this.tokens){
            return;
        }

        const oidcServerConfiguration = await this.initAsync(configuration.authority, configuration.authority_configuration);
        const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
        if (serviceWorker) {
            const {tokens} = await serviceWorker.initAsync(oidcServerConfiguration, "syncTokensAsync");
            if(!tokens){
                try {
                    this.publishEvent(eventNames.syncTokensAsync_begin, {});
                    this.syncTokensAsyncPromise = this.silentSigninAsync();
                    const silent_token_response = await this.syncTokensAsyncPromise;
                    if (silent_token_response && silent_token_response.tokens) {
                        this.tokens = await setTokensAsync(serviceWorker, silent_token_response.tokens);
                    } else{
                        this.publishEvent(eventNames.syncTokensAsync_error, null);
                        if(this.timeoutId){
                            timer.clearTimeout(this.timeoutId);
                            this.timeoutId=null;
                        }
                        return;
                    }
                } catch (exceptionSilent) {
                    console.error(exceptionSilent);
                    this.publishEvent(eventNames.syncTokensAsync_error, exceptionSilent);
                    if(this.timeoutId){
                        timer.clearTimeout(this.timeoutId);
                        this.timeoutId=null;
                    }
                    return;
                }
                this.syncTokensAsyncPromise = null;
                this.publishEvent(eventNames.syncTokensAsync_end, {});
            }
        }
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
     
     userInfoAsync(){
         return userInfoAsync(this);
     }
     
     async destroyAsync() {
        if(this.serviceWorker){
            await this.serviceWorker.clearAsync();
        }
         if(this.session){
             await this.session.clearAsync();
         }
         this.tokens = null;
         this.userInfo = null;
         this.events = [];
         timer.clearTimeout(this.timeoutId);
         this.timeoutId=null;
     }
     
    async logoutAsync(callbackPathOrUrl: string | undefined = undefined, extras: StringMap = null) {
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
        await this.destroyAsync();  
        if(oidcServerConfiguration.endSessionEndpoint) {
            let extraQueryString = "";
            if(extras){
                for (let [key, value] of Object.entries(extras)) {
                    extraQueryString +=`&${key}=${encodeURIComponent(value)}`;
                }
            }
            window.location.href = `${oidcServerConfiguration.endSessionEndpoint}?post_logout_redirect_uri=${encodeURIComponent(url)}&id_token_hint=${idToken}${extraQueryString}`;
        }
        else{
            window.location.reload();
        }
    }
  }
  

  export default Oidc;
