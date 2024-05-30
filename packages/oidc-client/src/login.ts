import {generateRandom} from './crypto.js';
import {eventNames} from './events.js';
import {initSession} from './initSession.js';
import {initWorkerAsync} from './initWorker.js';
import {isTokensOidcValid} from './parseTokens.js';
import {
    performAuthorizationRequestAsync,
    performFirstTokenRequestAsync
} from './requests.js';
import {getParseQueryStringFromLocation} from './route-utils.js';
import {OidcConfiguration, StringMap} from './types.js';
import {generateJwkAsync, generateJwtDemonstratingProofOfPossessionAsync} from "./jwt";
import {ILOidcLocation} from "./location";
import Oidc from "./oidc";

// eslint-disable-next-line @typescript-eslint/ban-types
export const defaultLoginAsync = (configurationName:string, configuration:OidcConfiguration, publishEvent :(string, any)=>void, initAsync:Function, oidcLocation: ILOidcLocation) => (callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined) => {
    const originExtras = extras;
    extras = { ...extras };
    const loginLocalAsync = async () => {
        const url = callbackPath || oidcLocation.getPath();

        if (!('state' in extras)) {
            extras.state = generateRandom(16);
        }

        publishEvent(eventNames.loginAsync_begin, {});
        if (extras) {
            for (const key of Object.keys(extras)) {
                if (key.endsWith(':token_request')) {
                    delete extras[key];
                }
            }
        }
        try {
            const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
            if (!scope) {
                scope = configuration.scope;
            }

            const extraFinal = !configuration.extras ? extras : { ...configuration.extras, ...extras };
            if (!extraFinal.nonce) {
                extraFinal.nonce = generateRandom(12);
            }
            const serviceWorker = await initWorkerAsync(configuration, configurationName);
            const oidcServerConfiguration = await initAsync(configuration.authority, configuration.authority_configuration);
            let storage;
            if (serviceWorker) {
                serviceWorker.setLoginParams({ callbackPath: url, extras: originExtras });
                await serviceWorker.initAsync(oidcServerConfiguration, 'loginAsync', configuration);
                await serviceWorker.setNonceAsync(extraFinal.nonce);
                serviceWorker.startKeepAliveServiceWorker();
                storage = serviceWorker;
            } else {
                const session = initSession(configurationName, configuration.storage ?? sessionStorage);
                session.setLoginParams({ callbackPath: url, extras: originExtras });
                await session.setNonceAsync(extraFinal.nonce);
                storage = session;
            }

            // @ts-ignore
            const extraInternal = {
                client_id: configuration.client_id,
                redirect_uri: redirectUri,
                scope,
                response_type: 'code',
                ...extraFinal,
            };
            await performAuthorizationRequestAsync(storage, oidcLocation)(oidcServerConfiguration.authorizationEndpoint, extraInternal);
        } catch (exception) {
            publishEvent(eventNames.loginAsync_error, exception);
            throw exception;
        }
    };
    return loginLocalAsync();
};

export const loginCallbackAsync = (oidc:Oidc) => async (isSilentSignin = false) => {
    try {
        oidc.publishEvent(eventNames.loginCallbackAsync_begin, {});
        const configuration = oidc.configuration;
        const clientId = configuration.client_id;
        const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
        const authority = configuration.authority;
        const tokenRequestTimeout = configuration.token_request_timeout;
        const oidcServerConfiguration = await oidc.initAsync(authority, configuration.authority_configuration);
        const href = oidc.location.getCurrentHref();
        const queryParams = getParseQueryStringFromLocation(href);
        const sessionState = queryParams.session_state;
        const serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
        let storage;
        let nonce: string | undefined;
        let getLoginParams;
        let state: string | undefined;
        if (serviceWorker) {
            await serviceWorker.initAsync(oidcServerConfiguration, 'loginCallbackAsync', configuration);
            await serviceWorker.setSessionStateAsync(sessionState);
            nonce = await serviceWorker.getNonceAsync();
            getLoginParams = serviceWorker.getLoginParams();
            state = await serviceWorker.getStateAsync();
            serviceWorker.startKeepAliveServiceWorker();
            storage = serviceWorker;
        } else {
            const session = initSession(oidc.configurationName, configuration.storage ?? sessionStorage);
            await session.setSessionStateAsync(sessionState);
            nonce = await session.getNonceAsync();
            getLoginParams = session.getLoginParams();
            state = await session.getStateAsync();
            storage = session;
        }

        const params = getParseQueryStringFromLocation(href);
        
        if(params.error || params.error_description) {
            throw new Error(`Error from OIDC server: ${params.error} - ${params.error_description}`);
        }

        if (params.iss && params.iss !== oidcServerConfiguration.issuer) {
            console.error();
            throw new Error(`Issuer not valid (expected: ${oidcServerConfiguration.issuer}, received: ${params.iss})`);
        }
        if (params.state && params.state !== state) {
            throw new Error(`State not valid (expected: ${state}, received: ${params.state})`);
        }

        const data = {
            code: params.code,
            grant_type: 'authorization_code',
            client_id: configuration.client_id,
            redirect_uri: redirectUri,
        };

        const extras = {};
        // @ts-ignore
        if (configuration.token_request_extras) {
            for (const [key, value] of Object.entries(configuration.token_request_extras)) {
                extras[key] = value;
            }
        }
        if (getLoginParams && getLoginParams.extras) {
            for (const [key, value] of Object.entries(getLoginParams.extras)) {
                if (key.endsWith(':token_request')) {
                    extras[key.replace(':token_request', '')] = value;
                }
            }
        }
        
        const url = oidcServerConfiguration.tokenEndpoint;
        const headersExtras = {};
        if(configuration.demonstrating_proof_of_possession) {
            if (serviceWorker) {
                headersExtras['DPoP'] = `DPOP_SECURED_BY_OIDC_SERVICE_WORKER_${oidc.configurationName}`;
            } else {
                const jwk = await generateJwkAsync(window)(configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm);
                const session = initSession(oidc.configurationName, configuration.storage);
                await session.setDemonstratingProofOfPossessionJwkAsync(jwk);
                headersExtras['DPoP'] = await generateJwtDemonstratingProofOfPossessionAsync(window)(configuration.demonstrating_proof_of_possession_configuration)(jwk, 'POST', url);
            }
        }

        const tokenResponse = await performFirstTokenRequestAsync(storage)(url, 
            { ...data, ...extras },
            headersExtras,
            oidc.configuration.token_renew_mode, 
            tokenRequestTimeout);

        if (!tokenResponse.success) {
            throw new Error('Token request failed');
        }

        let loginParams;
        const formattedTokens = tokenResponse.data.tokens;
        const demonstratingProofOfPossessionNonce = tokenResponse.data.demonstratingProofOfPossessionNonce;

        // @ts-ignore
        if (tokenResponse.data.state !== extras.state) {
            throw new Error('state is not valid');
        }
        const { isValid, reason } = isTokensOidcValid(formattedTokens, nonce, oidcServerConfiguration);
        if (!isValid) {
            throw new Error(`Tokens are not OpenID valid, reason: ${reason}`);
        }
        
        if(serviceWorker){
            if(formattedTokens.refreshToken && !formattedTokens.refreshToken.includes("SECURED_BY_OIDC_SERVICE_WORKER")) {
                throw new Error("Refresh token should be hidden by service worker");
            }

            if(demonstratingProofOfPossessionNonce && formattedTokens.accessToken && formattedTokens.accessToken.includes("SECURED_BY_OIDC_SERVICE_WORKER")) {
                throw new Error("Demonstration of proof of possession require Access token not hidden by service worker");
            }
        }
        
        if (serviceWorker) {
            await serviceWorker.initAsync(oidcServerConfiguration, 'syncTokensAsync', configuration);
            loginParams = serviceWorker.getLoginParams();
            if(demonstratingProofOfPossessionNonce) {
                await serviceWorker.setDemonstratingProofOfPossessionNonce(demonstratingProofOfPossessionNonce);
            }
        } else {
            const session = initSession(oidc.configurationName, configuration.storage);
            loginParams = session.getLoginParams();
            if(demonstratingProofOfPossessionNonce) {
                await session.setDemonstratingProofOfPossessionNonce(demonstratingProofOfPossessionNonce);
            }
        }

        await oidc.startCheckSessionAsync(oidcServerConfiguration.checkSessionIframe, clientId, sessionState, isSilentSignin);
        oidc.publishEvent(eventNames.loginCallbackAsync_end, {});
        return {
            tokens: formattedTokens,
            state: 'request.state',
            callbackPath: loginParams.callbackPath,
        };
    } catch (exception) {
        console.error(exception);
        oidc.publishEvent(eventNames.loginCallbackAsync_error, exception);
        throw exception;
    }
};
