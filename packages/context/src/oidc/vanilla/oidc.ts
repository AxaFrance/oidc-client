import {
    TokenRequest,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN,
    AuthorizationServiceConfiguration,
    RedirectRequestHandler,
    AuthorizationNotifier,
    AuthorizationRequest,
    FetchRequestor, LocalStorageBackend, DefaultCrypto
} from '@openid/appauth';
import {NoHashQueryStringUtils} from './noHashQueryStringUtils';
import {initAsync} from './initWorker'

initAsync("/OidcServiceWorker.js")
/*

 class MemoryStorageBackend {
    constructor() {
        this.items={};
        this.getItem.bind(this);
        this.removeItem.bind(this);
        this.clear.bind(this);
        this.setItem.bind(this);
    }
    
    getItem(name){
        return Promise.resolve(this.items[name]);
    }
  
    removeItem(name){
        delete this.items[name];
        return Promise.resolve();
    }
  
    clear(){
         this.items= {};
        return Promise.resolve();
    }
  
    setItem(name, value) {
        this.items[name]=value;
        return Promise.resolve();
    }
  }*/

export type Configuration = {
    client_id: string,
    redirect_uri: string,
    scope: string,
    authority: string,
};

const oidcDatabase = {};
const oidcFactory = (configuration: Configuration, name="default") => {
    if(oidcDatabase[name]){
        return oidcDatabase[name];
    }
    oidcDatabase[name] = new Oidc(configuration)
    return oidcDatabase[name];
}

const loginCallbackWithAutoTokensRenewAsync = async (oidc) => {
    
    const response = await oidc.loginCallbackAsync();
    const tokens = response.tokens
    oidc.publishEvent(Oidc.eventNames.token_aquired, {});
    oidc.tokens = tokens;
    oidc.timeoutId = autoRenewTokensAsync(oidc, tokens.refreshToken, tokens.expiresIn)
    return response.state;
}
const autoRenewTokensAsync = async (oidc,refreshToken, intervalSeconds) =>{
    return setTimeout(async () => {
        const tokens = await oidc.refreshTokensAsync(refreshToken);
        oidc.tokens = tokens;
        oidc.publishEvent(Oidc.eventNames.token_renewed, {});
        oidc.timeoutId = autoRenewTokensAsync(oidc, tokens.refreshToken, tokens.expiresIn)
      }, (intervalSeconds- 20) *1000);
}

const userInfoAsync = async (oidc)=> {
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

const eventNames = {
    token_aquired: "token_aquired",
    token_renewed: "token_renewed",
    loginAsync_begin:"loginAsync_begin",
    loginAsync_error:"loginAsync_error",
    loginCallbackAsync_begin:"loginCallbackAsync_begin",
    loginCallbackAsync_end:"loginCallbackAsync_end",
    refreshTokensAsync_begin: "refreshTokensAsync_begin",
    refreshTokensAsync_end: "refreshTokensAsync_end",
    refreshTokensAsync_error: "refreshTokensAsync_error",
}

class Oidc {
    public configuration: Configuration;
    public userInfo: null;
    public tokens: null;
    public events: Array<any>;
    private timeoutId: NodeJS.Timeout; 
    constructor(configuration:Configuration) {
      this.configuration = configuration
      this.tokens = null
      this.userInfo = null;
      this.events = []
        this.timeoutId = null;
      this.refreshTokensAsync.bind(this);
      this.loginCallbackWithAutoTokensRenewAsync.bind(this);
      this.initAsync.bind(this);
      this.loginCallbackAsync.bind(this);
      this.subscriveEvents.bind(this);
      this.removeEvent.bind(this);
      this.publishEvent.bind(this);
      this.destroy.bind(this);
    }

    subscriveEvents(func){
        const id = new Date().getTime().toString();
        this.events.push({id, func});
        return id;
    }

    removeEvent(id){
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
    static eventNames = eventNames;

    async initAsync(authority) {
        const oidcServerConfiguration = await AuthorizationServiceConfiguration.fetchFromIssuer(authority, new FetchRequestor());
        return oidcServerConfiguration;
    }

    async loginAsync(callbackPath=undefined) {
        try {
            const location = window.location;
            const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
            const state = url 
            this.publishEvent(eventNames.loginAsync_begin, {})
            const configuration = this.configuration;
            const authorizationHandler = new RedirectRequestHandler(new LocalStorageBackend(), new NoHashQueryStringUtils(), window.location, new DefaultCrypto());
            const oidcServerConfiguration = await this.initAsync(configuration.authority)
                    const authRequest = new AuthorizationRequest({
                        client_id: configuration.client_id,
                        redirect_uri: configuration.redirect_uri,
                        scope: configuration.scope,
                        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
                        state,
                    });
                    authorizationHandler.performAuthorizationRequest(oidcServerConfiguration, authRequest);
        } catch(exception){
                this.publishEvent(eventNames.loginAsync_error, exception);
                throw exception;
        }
    }

    async loginCallbackAsync() {
        this.publishEvent(eventNames.loginCallbackAsync_begin, {})
        const clientId = this.configuration.client_id;
        const redirectURL = this.configuration.redirect_uri;
        const authority =  this.configuration.authority;
        const promise = new Promise((resolve, reject) => {
            const tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
            const authorizationHandler = new RedirectRequestHandler(new LocalStorageBackend(), new NoHashQueryStringUtils(), window.location, new DefaultCrypto());
            const notifier = new AuthorizationNotifier();
            authorizationHandler.setAuthorizationNotifier(notifier);
        
            notifier.setAuthorizationListener(async (request, response, error) => {
                console.log('Authorization request complete ', request, response, error);
                if(error){
                    reject(error);
                }
                if (!response) {
                    return;
                }
                console.log(`Authorization Code  ${response.code}`);

                let extras = null;
                if (request && request.internal) {
                    extras = {};
                    extras.code_verifier = request.internal.code_verifier;
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
                    const oidcServerConfiguration = await this.initAsync(authority);
                    const tokenResponse =  await tokenHandler.performTokenRequest(oidcServerConfiguration, tokenRequest);
                    console.log(tokenResponse)
                    resolve({tokens:tokenResponse, state: request.state});
                    this.publishEvent(eventNames.loginCallbackAsync_end, {})
                } catch(exception){
                    reject(exception);
                }
            });
            authorizationHandler.completeAuthorizationRequestIfPossible();
        });
        
        return promise;
    }

    async refreshTokensAsync(refreshToken) {
        try{
            this.publishEvent(eventNames.refreshTokensAsync_begin, {})
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
            console.log(token_response)
            this.publishEvent(eventNames.refreshTokensAsync_end, {});
            return token_response;
        } catch(exception) {
            this.publishEvent(eventNames.refreshTokensAsync_error, {});
            throw exception;
        }
     }
     
     loginCallbackWithAutoTokensRenewAsync():Promise<string>{
        return loginCallbackWithAutoTokensRenewAsync(this);
     }
     
     userInfoAsync(){
         return userInfoAsync(this);
     }
     
     destroy(){
         this.tokens = null;
         this.userInfo = null;
         window.clearTimeout(this.timeoutId);
     }
     
    async logoutAsync() {
        const oidcServerConfiguration = await this.initAsync(this.configuration.authority);
        this.destroy();
        window.location.href = oidcServerConfiguration.endSessionEndpoint;
    }
  }
  

  export default Oidc;