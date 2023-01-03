import { AuthorizationRequest, DefaultCrypto, RedirectRequestHandler } from '@openid/appauth';

import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import { MemoryStorageBackend } from './memoryStorageBackend';
import { HashQueryStringUtils, NoHashQueryStringUtils } from './noHashQueryStringUtils';
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
export const defaultLoginAsync = (window, configurationName, configuration:OidcConfiguration, silentLoginAsync:Function, publishEvent :(string, any)=>void, initAsync:Function, oidc:any) => (callbackPath:string = undefined, extras:StringMap = null, isSilentSignin = false, scope:string = undefined, silentLoginOnly = false) => {
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

        if (silentLoginOnly) {
            try {
                const extraFinal = extras ?? configuration.extras ?? {};
                const silentResult = await silentLoginAsync({
                    ...extraFinal,
                    prompt: 'none',
                }, state, scope);

                if (silentResult) {
                    oidc.tokens = silentResult.tokens;
                    publishEvent(eventNames.token_aquired, {});
                    // @ts-ignore
                    this.timeoutId = autoRenewTokens(this, this.tokens.refreshToken, this.tokens.expiresAt, extras);
                    return {};
                }
            } catch (e) {
                return e;
            }
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

            const extraFinal = extras ?? configuration.extras ?? {};
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
