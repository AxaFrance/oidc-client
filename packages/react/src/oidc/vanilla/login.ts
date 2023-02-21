import { generateRandom } from './crypto';
import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import { isTokensOidcValid } from './parseTokens';
import { performAuthorizationRequestAsync, performFirstTokenRequestAsync } from './requests';
import { getParseQueryStringFromLocation } from './route-utils';
import { OidcConfiguration, StringMap } from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
export const defaultLoginAsync = (window, configurationName, configuration:OidcConfiguration, publishEvent :(string, any)=>void, initAsync:Function) => (callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined) => {
    const originExtras = extras;
    extras = { ...extras };
    const loginLocalAsync = async () => {
        const location = window.location;
        const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');

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
            const nonce = { nonce: extraFinal.nonce };
            const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, configurationName);
            const oidcServerConfiguration = await initAsync(configuration.authority, configuration.authority_configuration);
            let storage;
            if (serviceWorker) {
                serviceWorker.setLoginParams(configurationName, { callbackPath: url, extras: originExtras });
                serviceWorker.startKeepAliveServiceWorker();
                await serviceWorker.initAsync(oidcServerConfiguration, 'loginAsync', configuration);
                await serviceWorker.setNonceAsync(nonce);
                storage = serviceWorker;
            } else {
                const session = initSession(configurationName, configuration.storage ?? sessionStorage);
                session.setLoginParams(configurationName, { callbackPath: url, extras: originExtras });
                await session.setNonceAsync(nonce);
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
            await performAuthorizationRequestAsync(storage)(oidcServerConfiguration.authorizationEndpoint, extraInternal);
        } catch (exception) {
            publishEvent(eventNames.loginAsync_error, exception);
            throw exception;
        }
    };
    return loginLocalAsync();
};

export const loginCallbackAsync = (oidc) => async (isSilentSignin = false) => {
    try {
        oidc.publishEvent(eventNames.loginCallbackAsync_begin, {});
        const configuration = oidc.configuration;
        const clientId = configuration.client_id;
        const redirectUri = isSilentSignin ? configuration.silent_redirect_uri : configuration.redirect_uri;
        const authority = configuration.authority;
        const tokenRequestTimeout = configuration.token_request_timeout;
        const oidcServerConfiguration = await oidc.initAsync(authority, configuration.authority_configuration);
        const queryParams = getParseQueryStringFromLocation(window.location.href);
        const sessionState = queryParams.session_state;
        const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, oidc.configurationName);
        let storage;
        let nonceData;
        let getLoginParams;
        let state;
        if (serviceWorker) {
            serviceWorker.startKeepAliveServiceWorker();
            await serviceWorker.initAsync(oidcServerConfiguration, 'loginCallbackAsync', configuration);
            await serviceWorker.setSessionStateAsync(sessionState);
            nonceData = await serviceWorker.getNonceAsync();
            getLoginParams = serviceWorker.getLoginParams(oidc.configurationName);
            state = await serviceWorker.getStateAsync();
            storage = serviceWorker;
        } else {
            const session = initSession(oidc.configurationName, configuration.storage ?? sessionStorage);
            await session.setSessionStateAsync(sessionState);
            nonceData = await session.getNonceAsync();
            getLoginParams = session.getLoginParams(oidc.configurationName);
            state = await session.getStateAsync();
            storage = session;
        }

        const params = getParseQueryStringFromLocation(window.location.toString());

        if (params.iss && params.iss !== oidcServerConfiguration.issuer) {
            throw new Error('issuer not valid');
        }
        if (params.state && params.state !== state) {
            throw new Error('state not valid');
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

        const tokenResponse = await performFirstTokenRequestAsync(storage)(oidcServerConfiguration.tokenEndpoint, { ...data, ...extras }, oidc.configuration.token_renew_mode, tokenRequestTimeout);

        if (!tokenResponse.success) {
            throw new Error('Token request failed');
        }

        let loginParams;
        const formattedTokens = tokenResponse.data.tokens;
        if (serviceWorker) {
            await serviceWorker.initAsync(redirectUri, 'syncTokensAsync', configuration);
            loginParams = serviceWorker.getLoginParams(oidc.configurationName);
        } else {
            const session = initSession(oidc.configurationName, configuration.storage);
            loginParams = session.getLoginParams(oidc.configurationName);
        }
        // @ts-ignore
        if (tokenResponse.data.state !== extras.state) {
            throw new Error('state is not valid');
        }
        const { isValid, reason } = isTokensOidcValid(formattedTokens, nonceData.nonce, oidcServerConfiguration);
        if (!isValid) {
            throw new Error(`Tokens are not OpenID valid, reason: ${reason}`);
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
