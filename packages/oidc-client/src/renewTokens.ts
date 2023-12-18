import { initSession } from './initSession.js';
import { initWorkerAsync } from './initWorker.js';
import Oidc from './oidc.js';
import { computeTimeLeft } from './parseTokens.js';
import timer from './timer.js';
import { StringMap } from './types.js';

async function syncTokens(oidc, refreshToken, forceRefresh: boolean, extras: StringMap) {
    const updateTokens = (tokens) => {
        oidc.tokens = tokens;
    };
    const {tokens, status} = await oidc.synchroniseTokensAsync(refreshToken, 0, forceRefresh, extras, updateTokens);

    const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
    if (!serviceWorker) {
        const session = initSession(oidc.configurationName, oidc.configuration.storage);
        await session.setTokens(oidc.tokens);
    }

    if (!oidc.tokens) {
        await oidc.destroyAsync(status);
        return null;
    }
    return tokens;
}

async function loadLatestTokensAsync(oidc, configuration) {
    const serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
    if (serviceWorker) {
        const oidcServerConfiguration = await oidc.initAsync(configuration.authority, configuration.authority_configuration);
        const {tokens} = await serviceWorker.initAsync(oidcServerConfiguration, 'tryKeepExistingSessionAsync', configuration);
        return tokens;
    } else {
        const session = initSession(oidc.configurationName, configuration.storage ?? sessionStorage);
        const {tokens} = await session.initAsync();
        return tokens;
    }
}

export async function renewTokensAndStartTimerAsync(oidc, refreshToken, forceRefresh = false, extras:StringMap = null) {

    const configuration = oidc.configuration;
    const lockResourcesName = `${configuration.client_id}_${oidc.configurationName}_${configuration.authority}`;
    
    let tokens: null;
    const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
    
    if(configuration?.storage === window?.sessionStorage && !serviceWorker) {
        tokens = await syncTokens(oidc, refreshToken, forceRefresh, extras);
    } else {
        try {
        const controller = new AbortController();
        const timeout = Math.max(configuration.token_request_timeout??0, configuration.silent_login_timeout??0, 20000);
        const timeoutId = timer.setTimeout(() => {
            controller.abort();
            }, timeout);
        tokens = await navigator.locks.request(lockResourcesName, { signal: controller.signal, ifAvailable: true }, async (lock) => {
            if(!lock){
                return await loadLatestTokensAsync(oidc, configuration);
            }
            const tokens =  await syncTokens(oidc, refreshToken, forceRefresh, extras);
            timer.clearTimeout(timeoutId);
            return tokens;
        });
        } catch (e) {
            console.error(e);
            tokens = await loadLatestTokensAsync(oidc, configuration);
        }
        
    }
    
    if(!tokens){
        return null;
    }
    
    if (oidc.timeoutId) {
        // @ts-ignore
        oidc.timeoutId = autoRenewTokens(oidc, tokens.refreshToken, oidc.tokens.expiresAt, extras);
    }
    
    return oidc.tokens;
}

export const autoRenewTokens = (oidc, refreshToken, expiresAt, extras:StringMap = null) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second;
    return timer.setTimeout(async () => {
        const timeLeft = computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt);
        const timeInfo = { timeLeft };
        oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
        await renewTokensAndStartTimerAsync(oidc, refreshToken, false, extras);
    }, 1000);
};
