import { initSession } from './initSession.js';
import { initWorkerAsync } from './initWorker.js';
import { performRevocationRequestAsync, TOKEN_TYPE } from './requests.js';
import timer from './timer.js';
import { StringMap } from './types.js';

export const oidcLogoutTokens = {
    access_token: 'access_token',
    refresh_token: 'refresh_token',
};

export const destroyAsync = (oidc) => async (status) => {
    timer.clearTimeout(oidc.timeoutId);
    oidc.timeoutId = null;
    if (oidc.checkSessionIFrame) {
        oidc.checkSessionIFrame.stop();
    }
    const serviceWorker = await initWorkerAsync(oidc.configuration.service_worker_relative_url, oidc.configurationName);
    if (!serviceWorker) {
        const session = initSession(oidc.configurationName, oidc.configuration.storage);
        await session.clearAsync(status);
    } else {
        await serviceWorker.clearAsync(status);
    }
    oidc.tokens = null;
    oidc.userInfo = null;
};

export const logoutAsync = (oidc, oidcDatabase, fetch, window, console) => async (callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null) => {
    const configuration = oidc.configuration;
    const oidcServerConfiguration = await oidc.initAsync(configuration.authority, configuration.authority_configuration);
    if (callbackPathOrUrl && (typeof callbackPathOrUrl !== 'string')) {
        callbackPathOrUrl = undefined;
        console.warn('callbackPathOrUrl path is not a string');
    }
    const path = (callbackPathOrUrl === null || callbackPathOrUrl === undefined) ? location.pathname + (location.search || '') + (location.hash || '') : callbackPathOrUrl;
    let isUri = false;
    if (callbackPathOrUrl) {
        isUri = callbackPathOrUrl.includes('https://') || callbackPathOrUrl.includes('http://');
    }
    const url = isUri ? callbackPathOrUrl : window.location.origin + path;
    // @ts-ignore
    const idToken = oidc.tokens ? oidc.tokens.idToken : '';
    try {
        const revocationEndpoint = oidcServerConfiguration.revocationEndpoint;
        if (revocationEndpoint) {
            const promises = [];
            const accessToken = oidc.tokens.accessToken;
            if (accessToken && configuration.logout_tokens_to_invalidate.includes(oidcLogoutTokens.access_token)) {
                const revokeAccessTokenPromise = performRevocationRequestAsync(fetch)(revocationEndpoint, accessToken, TOKEN_TYPE.access_token, configuration.client_id);
                promises.push(revokeAccessTokenPromise);
            }
            const refreshToken = oidc.tokens.refreshToken;
            if (refreshToken && configuration.logout_tokens_to_invalidate.includes(oidcLogoutTokens.refresh_token)) {
                const revokeRefreshTokenPromise = performRevocationRequestAsync(fetch)(revocationEndpoint, refreshToken, TOKEN_TYPE.refresh_token, configuration.client_id);
                promises.push(revokeRefreshTokenPromise);
            }
            if (promises.length > 0) {
                await Promise.all(promises);
            }
        }
    } catch (exception) {
        console.warn('logoutAsync: error when revoking tokens, if the error persist, you ay configure property logout_tokens_to_invalidate from configuration to avoid this error');
        console.warn(exception);
    }
    // @ts-ignore
    const sub = oidc.tokens && oidc.tokens.idTokenPayload ? oidc.tokens.idTokenPayload.sub : null;
    await oidc.destroyAsync('LOGGED_OUT');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, itemOidc] of Object.entries(oidcDatabase)) {
        if (itemOidc !== oidc) {
            // @ts-ignore
            await oidc.logoutSameTabAsync(oidc.configuration.client_id, sub);
        }
    }

    if (oidcServerConfiguration.endSessionEndpoint) {
        if (!extras) {
            extras = {
                id_token_hint: idToken,
            };
            if (callbackPathOrUrl !== null) {
                extras.post_logout_redirect_uri = url;
            }
        }
        let queryString = '';
        if (extras) {
            for (const [key, value] of Object.entries(extras)) {
                if (queryString === '') {
                    queryString += '?';
                } else {
                    queryString += '&';
                }
                queryString += `${key}=${encodeURIComponent(value)}`;
            }
        }
        window.location.href = `${oidcServerConfiguration.endSessionEndpoint}${queryString}`;
    } else {
        window.location.reload();
    }
};
