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
import {NoHashQueryStringUtils} from './noHashQueryStringUtils';
import {initWorkerAsync} from './initWorker'
import {MemoryStorageBackend} from "./memoryStorageBackend";
import {initSession} from "./initSession";
import timer from './timer';

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

const extractAccessTokenPayload = tokens => {
    if(tokens.accessTokenPayload)
    {
        return tokens.accessTokenPayload;
    }
    const accessToken = tokens.accessToken;
    try{
        if (!accessToken || !accessToken.includes('.')) {
            return null;
        }
        return JSON.parse(atob(accessToken.split('.')[1]));
    } catch (e) {
        console.error(e);
    }
    return null;
};

export interface StringMap {
    [key: string]: string;
}

 export type Configuration = {
    client_id: string,
    redirect_uri: string,
     silent_redirect_uri?:string,
    scope: string,
    authority: string,
    refresh_time_before_tokens_expiration_in_second?: number,
    service_worker_relative_url?:string,
     service_worker_only?:boolean,
     extras?:StringMap
};

const oidcDatabase = {};
const oidcFactory = (configuration: Configuration, name="default") => {
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
    oidc.timeoutId = await autoRenewTokensAsync(oidc, tokens.refreshToken, oidc.tokens.expiresAt)
    return response.state;
}

const autoRenewTokensAsync = async (oidc, refreshToken, expiresAt) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second ?? 60;
    return  timer.setTimeout(async () => {
        const currentTimeUnixSecond = new Date().getTime() /1000;
        const timeInfo = { timeLeft:((expiresAt - refreshTimeBeforeTokensExpirationInSecond)- currentTimeUnixSecond)};
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
            oidc.timeoutId = await autoRenewTokensAsync(oidc, tokens.refreshToken, oidc.tokens.expiresAt);
        } else{
            oidc.timeoutId = await autoRenewTokensAsync(oidc, refreshToken, expiresAt)
        }
    }, 1000);
}

const userInfoAsync = async (oidc) => {
    if(oidc.userInfo != null){
        return oidc.userInfo;
    }
    if(!oidc.tokens){
        return null;
    }
    const accessToken = oidc.tokens.accessToken;

    const oidcServerConfiguration = await oidc.initAsync(oidc.configuration.authority);
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
    silentSigninAsync_end: "silentSigninAsync_end",
    silentSigninAsync_error: "silentSigninAsync_error",
}

export class Oidc {
    public configuration: Configuration;
    public userInfo: null;
    public tokens: null;
    public events: Array<any>;
    private timeoutId: NodeJS.Timeout;
    private serviceWorker?: any;
    private configurationName: string;
    private session?: any;
    constructor(configuration:Configuration, configurationName="default") {
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
        const id = new Date().getTime().toString();
        this.events.push({id, func});
        return id;
    }

    removeEventSubscription(id){
        const event = this.events.find(e => e.id === id);
        const index =this.events.indexOf(event);
        if(index >=0){
            this.events.slice(index, 1);    
        }
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
        return oidcDatabase[name];
    }
    static eventNames = eventNames;
    
    silentSigninCallbackFromIFrame(){
        if (this.configuration.silent_redirect_uri) {
            window.top.postMessage(`${this.configurationName}_oidc_tokens:${JSON.stringify(this.tokens)}`, window.location.origin);
        }
    }
    async silentSigninAsync() {
        if (!this.configuration.silent_redirect_uri) {
            return Promise.resolve(null);
        }
        this.publishEvent(eventNames.silentSigninAsync_begin, {});
        const link = this.configuration.silent_redirect_uri;
        const iframe = document.createElement('iframe');
        iframe.width = "0px";
        iframe.height = "0px";
        iframe.id = `${this.configurationName}_oidc_iframe`;
        iframe.setAttribute("src", link);
        document.body.appendChild(iframe);
        const self = this;
        const promise = new Promise((resolve, reject) => {
            try {
                let isResolved = false;
                window.onmessage = function (e) {
                    const key = `${self.configurationName}_oidc_tokens:`;
                    if (e.data && typeof (e.data) === "string" && e.data.startsWith(key)) {
                      
                        if (!isResolved) {
                            self.publishEvent(eventNames.silentSigninAsync_end, {});
                            resolve(JSON.parse(e.data.replace(key, '')));
                            iframe.remove();
                            isResolved = true;
                        }
                    }
                };

                setTimeout(() => {
                    if (!isResolved) {
                        reject("timeout");
                        self.publishEvent(eventNames.silentSigninAsync_error, new Error("timeout"));
                        iframe.remove();
                        isResolved = true;
                    }
                }, 12000);
            } catch (e) {
                iframe.remove();
                reject(e);
                self.publishEvent(eventNames.silentSigninAsync_error, e);
            }
        });
        return promise;
    }
    async initAsync(authority) {
        const oidcServerConfiguration = await AuthorizationServiceConfiguration.fetchFromIssuer(authority, new FetchRequestor());
        return oidcServerConfiguration;
    }
    
    async tryKeepExistingSessionAsync() {
        let serviceWorker
        if(this.tokens != null){
            return false;
        }
        this.publishEvent(eventNames.tryKeepExistingSessionAsync_begin, {});
        try {
            const configuration = this.configuration;
            const oidcServerConfiguration = await this.initAsync(configuration.authority);
            serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
            if(serviceWorker) {
                const { tokens } = await serviceWorker.initAsync(oidcServerConfiguration, "tryKeepExistingSessionAsync");
                if (tokens) {
                    serviceWorker.startKeepAliveServiceWorker();
                    const updatedTokens = await this.refreshTokensAsync(tokens.refresh_token, true);
                    // @ts-ignore
                    this.tokens = await setTokensAsync(serviceWorker, updatedTokens);
                    this.serviceWorker = serviceWorker;
                    // @ts-ignore
                    await autoRenewTokensAsync(this, updatedTokens.refreshToken, this.tokens.expiresAt);
                    this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {success: true, message : "tokens inside ServiceWorker are valid"});
                    return true;
                }
                this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {success: false, message : "no exiting session found"});
            } else {
                if(configuration.service_worker_relative_url) {
                    this.publishEvent(eventNames.service_worker_not_supported_by_browser, {
                        message: "service worker is not supported by this browser"
                    });
                }
                const session = initSession(this.configurationName);
                const {tokens} = await session.initAsync();
                if (tokens) {
                    const updatedTokens = await this.refreshTokensAsync(tokens.refreshToken, true);
                    // @ts-ignore
                    this.tokens = await setTokensAsync(serviceWorker, updatedTokens);
                    session.setTokens(this.tokens);
                    this.session = session;
                    // @ts-ignore
                    await autoRenewTokensAsync(this, updatedTokens.refreshToken, this.tokens.expiresAt);
                    this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {success: true, message : "tokens inside ServiceWorker are valid"});
                    return true;
                }
            }
            this.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {success: false, message : "no service worker"});
            return false;
        } catch (exception) {
            if(serviceWorker){
                await serviceWorker.clearAsync();
            }
            this.publishEvent(eventNames.tryKeepExistingSessionAsync_error, "tokens inside ServiceWorker are invalid");
            return false;
        }
    }

    async loginAsync(callbackPath:string=undefined, installServiceWorker=true) {
        try {
            const location = window.location;
            const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
            const state = url;
            this.publishEvent(eventNames.loginAsync_begin, {});
            const configuration = this.configuration
            // Security we cannot loggin from Iframe
            if (!configuration.silent_redirect_uri && isInIframe()) {
                throw new Error("Login from iframe is forbidden");
            }
            let serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
            const oidcServerConfiguration = await this.initAsync(configuration.authority);
            if(serviceWorker && installServiceWorker) {
                const isServiceWorkerProxyActive = await serviceWorker.isServiceWorkerProxyActiveAsync()
                if(!isServiceWorkerProxyActive) {
                    window.location.href = configuration.redirect_uri + "/service-worker-install?callbackPath=" + encodeURIComponent(url);
                    return;
                }
            }
            let storage;
            if(serviceWorker) {
                serviceWorker.startKeepAliveServiceWorker();
                await serviceWorker.initAsync(oidcServerConfiguration, "loginAsync");
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, {});
            } else {
                const session = initSession(this.configurationName);
                storage = new MemoryStorageBackend(session.saveItemsAsync, {});
            }
            
            // @ts-ignore
            const authorizationHandler = new RedirectRequestHandler(storage, new NoHashQueryStringUtils(), window.location, new DefaultCrypto());
                    const authRequest = new AuthorizationRequest({
                        client_id: configuration.client_id,
                        redirect_uri: configuration.redirect_uri,
                        scope: configuration.scope,
                        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
                        state,
                        extras: configuration.extras
                    });
                    authorizationHandler.performAuthorizationRequest(oidcServerConfiguration, authRequest);
        } catch(exception){
                this.publishEvent(eventNames.loginAsync_error, exception);
                throw exception;
        }
    }

    async loginCallbackAsync() {
        try {
            this.publishEvent(eventNames.loginCallbackAsync_begin, {});
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectURL = configuration.redirect_uri;
            const authority =  configuration.authority;
            const oidcServerConfiguration = await this.initAsync(authority);
            const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, this.configurationName);
            let storage = null;
            if(serviceWorker){
                serviceWorker.startKeepAliveServiceWorker();
                this.serviceWorker = serviceWorker;
                await serviceWorker.initAsync(oidcServerConfiguration, "loginCallbackAsync");
                const items = await serviceWorker.loadItemsAsync();
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, items);
            }else{
                const session = initSession(this.configurationName);
                this.session = session;
                const items = await session.loadItemsAsync();
                storage = new MemoryStorageBackend(session.saveItemsAsync, items);
            }
            
            const promise = new Promise((resolve, reject) => {
                const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
                // @ts-ignore
                const authorizationHandler = new RedirectRequestHandler(storage, new NoHashQueryStringUtils(), window.location, new DefaultCrypto());
                const notifier = new AuthorizationNotifier();
                authorizationHandler.setAuthorizationNotifier(notifier);
            
                notifier.setAuthorizationListener(async (request, response, error) => {
                    if(error){
                        reject(error);
                    }
                    if (!response) {
                        return;
                    }
    
                    let extras = null;
                    if (request && request.internal) {
                        extras = {};
                        extras.code_verifier = request.internal.code_verifier;
                        if(configuration.extras) {
                            for (let [key, value] of Object.entries(configuration.extras)) {
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
                    
                    try {
                        const tokenResponse =  await tokenHandler.performTokenRequest(oidcServerConfiguration, tokenRequest);
                        resolve({tokens:tokenResponse, state: request.state});
                        this.publishEvent(eventNames.loginCallbackAsync_end, {})
                    } catch(exception){
                        this.publishEvent(eventNames.loginCallbackAsync_error, exception);
                        console.error(exception);
                        reject(exception);
                    }
                });
                authorizationHandler.completeAuthorizationRequestIfPossible();
            });
            return promise;
        } catch(exception) {
            console.error(exception);
            this.publishEvent(eventNames.loginCallbackAsync_error, exception);
            throw exception;
        }

    }

    async refreshTokensAsync(refreshToken, silentEvent = false) {
        try{
            this.publishEvent(silentEvent ? eventNames.refreshTokensAsync_silent_begin : eventNames.refreshTokensAsync_begin, {})
            const configuration = this.configuration;
            const clientId = configuration.client_id;
            const redirectUri = configuration.redirect_uri;
            const authority =  configuration.authority;

            const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
            // use the token response to make a request for an access token
            const request = new TokenRequest({
                client_id: clientId,
                redirect_uri: redirectUri,
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                code: undefined,
                refresh_token: refreshToken,
                extras: undefined
                });
            
            const oidcServerConfiguration = await this.initAsync(authority);
            const token_response = await tokenHandler.performTokenRequest(oidcServerConfiguration, request);
            this.publishEvent(silentEvent ? eventNames.refreshTokensAsync_silent_end :eventNames.refreshTokensAsync_end, token_response);
            return token_response;
        } catch(exception) {
            console.error(exception);
            try {
                const silent_token_response = await this.silentSigninAsync();
                if (silent_token_response) {
                    return silent_token_response;
                }
            } catch(exceptionSilent) {
                console.error(exceptionSilent);
            }
            
            this.publishEvent( silentEvent ? eventNames.refreshTokensAsync_silent_error :eventNames.refreshTokensAsync_error, exception);
            return null;
        }
     }
     
     loginCallbackWithAutoTokensRenewAsync():Promise<string>{
        return loginCallbackWithAutoTokensRenewAsync(this);
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
         window.clearTimeout(this.timeoutId);
     }
     
    async logoutAsync() {
        const oidcServerConfiguration = await this.initAsync(this.configuration.authority);
        // TODO implement real logout
        await this.destroyAsync();  
        if(oidcServerConfiguration.endSessionEndpoint) {
            window.location.href = oidcServerConfiguration.endSessionEndpoint;
        }
        else{
            window.location.reload();
        }
    }
  }
  

  export default Oidc;