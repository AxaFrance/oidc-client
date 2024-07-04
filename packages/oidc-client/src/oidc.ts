import {startCheckSessionAsync as defaultStartCheckSessionAsync} from './checkSession.js';
import {CheckSessionIFrame} from './checkSessionIFrame.js';
import {eventNames} from './events.js';
import {initSession} from './initSession.js';
import {defaultServiceWorkerUpdateRequireCallback, initWorkerAsync, sleepAsync} from './initWorker.js';
import {defaultLoginAsync, loginCallbackAsync} from './login.js';
import {destroyAsync, logoutAsync} from './logout.js';
import {TokenRenewMode, Tokens,} from './parseTokens.js';
import {
    autoRenewTokens,
    renewTokensAndStartTimerAsync
} from './renewTokens.js';
import {fetchFromIssuer} from './requests.js';
import {getParseQueryStringFromLocation} from './route-utils.js';
import defaultSilentLoginAsync from './silentLogin.js';
import timer from './timer.js';
import {AuthorityConfiguration, Fetch, OidcConfiguration, StringMap, TokenAutomaticRenewMode} from './types.js';
import {userInfoAsync} from './user.js';
import {base64urlOfHashOfASCIIEncodingAsync} from "./crypto";
import {
    defaultDemonstratingProofOfPossessionConfiguration,
    generateJwtDemonstratingProofOfPossessionAsync
} from "./jwt";
import {ILOidcLocation, OidcLocation} from "./location";
import {activateServiceWorker} from "./initWorkerOption";
import {tryKeepSessionAsync} from "./keepSession";



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
    oidc.timeoutId = autoRenewTokens(oidc, parsedTokens.expiresAt);
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
    public timeoutId: NodeJS.Timeout | number;
    public configurationName: string;
    public checkSessionIFrame: CheckSessionIFrame;
    public getFetch: () => Fetch;
    public location: ILOidcLocation;
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
          token_automatic_renew_mode: configuration.token_automatic_renew_mode ?? TokenAutomaticRenewMode.AutomaticBeforeTokenExpiration,
          monitor_session: configuration.monitor_session ?? false,
          refresh_time_before_tokens_expiration_in_second,
          silent_login_timeout: configuration.silent_login_timeout ?? 12000,
          token_renew_mode: configuration.token_renew_mode ?? TokenRenewMode.access_token_or_id_token_invalid,
          demonstrating_proof_of_possession: configuration.demonstrating_proof_of_possession ?? false,
          authority_timeout_wellknowurl_in_millisecond: configuration.authority_timeout_wellknowurl_in_millisecond ?? 10000,
          logout_tokens_to_invalidate: configuration.logout_tokens_to_invalidate ?? ['access_token', 'refresh_token'],
          service_worker_update_require_callback,
          service_worker_activate: configuration.service_worker_activate ?? activateServiceWorker,
          demonstrating_proof_of_possession_configuration: configuration.demonstrating_proof_of_possession_configuration ?? defaultDemonstratingProofOfPossessionConfiguration,
          preload_user_info: configuration.preload_user_info ?? false,
      };
      
      this.getFetch = getFetch ?? getFetchDefault;
      this.configurationName = configurationName;
      this.tokens = null;
      this.userInfo = null;
      this.events = [];
      this.timeoutId = null;
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
Please checkout that you are using OIDC hook inside a <OidcProvider configurationName="${name}"></OidcProvider> component.`);
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

    _silentLoginErrorCallbackFromIFrame(exception=null) {
        if (this.configuration.silent_redirect_uri && this.configuration.silent_login_uri) {
            const location = this.location;
            const queryParams = getParseQueryStringFromLocation(location.getCurrentHref());
            if(queryParams.error) {
                window.parent.postMessage(`${this.configurationName}_oidc_error:${JSON.stringify({error: queryParams.error})}`, location.getOrigin());
            } else {
                window.parent.postMessage(`${this.configurationName}_oidc_exception:${JSON.stringify({ error: exception == null ? "" : exception.toString() })}`, location.getOrigin());
            }
            
        }
    }

    async silentLoginCallbackAsync() {
        try {
            await this.loginCallbackAsync(true);
            this._silentLoginCallbackFromIFrame();
        } catch (exception) {
            console.error(exception);
            this._silentLoginErrorCallbackFromIFrame(exception);
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
        this.tryKeepExistingSessionPromise = tryKeepSessionAsync(this);
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
        if (this.logoutPromise) {
            await this.logoutPromise;
        }
        
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
            if(this.configuration.preload_user_info){
                await this.userInfoAsync();
            }
            // @ts-ignore
            return { parsedTokens, state: response.state, callbackPath: response.callbackPath };
        };
        this.loginCallbackPromise = loginCallbackLocalAsync();
        return this.loginCallbackPromise.then(result => {
            this.loginCallbackPromise = null;
            return result;
        });
    }

    async generateDemonstrationOfProofOfPossessionAsync(accessToken:string, url:string, method:string, extras:StringMap= {}): Promise<string> {

        const configuration = this.configuration;
        const claimsExtras = {
            ath: await base64urlOfHashOfASCIIEncodingAsync(accessToken),
            ...extras
        };

        const serviceWorker = await initWorkerAsync(configuration, this.configurationName);
        let demonstratingProofOfPossessionNonce:string;
        
        if (serviceWorker) {
            return `DPOP_SECURED_BY_OIDC_SERVICE_WORKER_${this.configurationName}`;
        }
        
        const session = initSession(this.configurationName, configuration.storage);
        let jwk = await session.getDemonstratingProofOfPossessionJwkAsync();
        demonstratingProofOfPossessionNonce = await session.getDemonstratingProofOfPossessionNonce();
        

        if (demonstratingProofOfPossessionNonce) {
            claimsExtras['nonce'] = demonstratingProofOfPossessionNonce;
        }
        
        return await generateJwtDemonstratingProofOfPossessionAsync(window)(configuration.demonstrating_proof_of_possession_configuration)(jwk, method, url, claimsExtras);
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
     userInfoAsync(noCache = false, demonstrating_proof_of_possession=false) {
         if (this.userInfoPromise !== null) {
             return this.userInfoPromise;
         }
         this.userInfoPromise = userInfoAsync(this)(noCache, demonstrating_proof_of_possession);
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
         this.renewTokensPromise = renewTokensAndStartTimerAsync(this, true, extras);
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
             await this.destroyAsync('LOGGED_OUT');
             this.publishEvent(eventNames.logout_from_same_tab, { mmessage: 'SessionMonitor', sub });
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
