import {
    AuthorizationNotifier,
    AuthorizationRequest, BaseTokenRequestHandler,
    DefaultCrypto, FetchRequestor, GRANT_TYPE_AUTHORIZATION_CODE,
    RedirectRequestHandler,
    TokenRequest,
} from '@openid/appauth';

import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import { MemoryStorageBackend } from './memoryStorageBackend';
import { HashQueryStringUtils, NoHashQueryStringUtils } from './noHashQueryStringUtils';
import { isTokensOidcValid, setTokens } from './parseTokens';
import { getParseQueryStringFromLocation } from './route-utils';
import { OidcConfiguration, StringMap } from './types';

const randomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const defaultLoginAsync = (window, configurationName, configuration:OidcConfiguration, publishEvent :(string, any)=>void, initAsync:Function) => (callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined) => {
    const originExtras = extras;
    extras = { ...extras };
    const loginLocalAsync = async () => {
        const location = window.location;
        const url = callbackPath || location.pathname + (location.search || '') + (location.hash || '');
        let state;
        if (extras && 'state' in extras) {
            state = extras.state;
            delete extras.state;
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
                extraFinal.nonce = randomString(12);
            }
            const nonce = { nonce: extraFinal.nonce };
            const serviceWorker = await initWorkerAsync(configuration.service_worker_relative_url, configurationName);
            const oidcServerConfiguration = await initAsync(configuration.authority, configuration.authority_configuration);
            let storage;
            if (serviceWorker) {
                serviceWorker.setLoginParams(configurationName, { callbackPath: url, extras: originExtras, state });
                serviceWorker.startKeepAliveServiceWorker();
                await serviceWorker.initAsync(oidcServerConfiguration, 'loginAsync', configuration);
                await serviceWorker.setNonceAsync(nonce);
                storage = new MemoryStorageBackend(serviceWorker.saveItemsAsync, {});
                await storage.setItem('dummy', {});
            } else {
                let session = initSession(configurationName, configuration.storage ?? sessionStorage);
                session.setLoginParams(configurationName, { callbackPath: url, extras: originExtras, state });
                session = initSession(configurationName);
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
        let storage = null;
        let nonceData = null;
        let getLoginParams = null;
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
            getLoginParams = serviceWorker.getLoginParams(oidc.configurationName);
        } else {
            const session = initSession(oidc.configurationName);
            session.setSessionState(sessionState);
            const items = await session.loadItemsAsync();
            storage = new MemoryStorageBackend(session.saveItemsAsync, items);
            nonceData = await session.getNonceAsync();
            getLoginParams = session.getLoginParams(oidc.configurationName);
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

                const extras = {};
                if (request && request.internal) {
                    // @ts-ignore
                    extras.code_verifier = request.internal.code_verifier;
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
                }

                const tokenRequest = new TokenRequest({
                    client_id: clientId,
                    redirect_uri: redirectUri, // @ts-ignore
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
                            oidc.timeoutId = null;
                            let loginParams = null;
                            let formattedTokens = null;
                            if (serviceWorker) {
                                const { tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'syncTokensAsync', configuration);
                                loginParams = serviceWorker.getLoginParams(oidc.configurationName);
                                formattedTokens = tokens;
                            } else {
                                const session = initSession(oidc.configurationName, configuration.storage);
                                loginParams = session.getLoginParams(oidc.configurationName);
                                formattedTokens = setTokens(tokenResponse, null, configuration.token_renew_mode);
                            }
                            if (!isTokensOidcValid(formattedTokens, nonceData.nonce, oidcServerConfiguration)) {
                                const exception = new Error('Tokens are not OpenID valid');
                                if (timeoutId) {
                                    clearTimeout(timeoutId);
                                    oidc.timeoutId = null;
                                    oidc.publishEvent(eventNames.loginCallbackAsync_error, exception);
                                    console.error(exception);
                                    reject(exception);
                                }
                            }

                            oidc.startCheckSessionAsync(oidcServerConfiguration.check_session_iframe, clientId, sessionState, isSilentSignin).then(() => {
                                oidc.publishEvent(eventNames.loginCallbackAsync_end, {});
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
                        oidc.timeoutId = null;
                        oidc.publishEvent(eventNames.loginCallbackAsync_error, exception);
                        console.error(exception);
                        reject(exception);
                    }
                }
            });
            authorizationHandler.completeAuthorizationRequestIfPossible();
        });
    } catch (exception) {
        console.error(exception);
        oidc.publishEvent(eventNames.loginCallbackAsync_error, exception);
        throw exception;
    }
};
