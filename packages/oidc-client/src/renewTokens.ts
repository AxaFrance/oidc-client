import {initSession} from './initSession.js';
import {initWorkerAsync} from './initWorker.js';
import Oidc from './oidc.js';
import {computeTimeLeft, setTokens} from './parseTokens.js';
import timer from './timer.js';
import {OidcConfiguration, StringMap} from './types.js';

async function syncTokens(oidc:Oidc, refreshToken, forceRefresh: boolean, extras: StringMap) {
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
        let {tokens} = await session.initAsync();
        // @ts-ignore
        tokens = setTokens(tokens, oidc.tokens, configuration.token_renew_mode);
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
        tokens = await navigator.locks.request(lockResourcesName, { ifAvailable: true }, async (lock) => {
            if(!lock){
                oidc.publishEvent(Oidc.eventNames.syncTokensAsync_lock_not_available, { lock: 'lock not available' });
                return await loadLatestTokensAsync(oidc, configuration);
            }
            return await syncTokens(oidc, refreshToken, forceRefresh, extras);
        });
        
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

export const autoRenewTokens = (oidc:Oidc, refreshToken, expiresAt, extras:StringMap = null) => {
    const refreshTimeBeforeTokensExpirationInSecond = oidc.configuration.refresh_time_before_tokens_expiration_in_second;
    return timer.setTimeout(async () => {
        const timeLeft = computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt);
        const timeInfo = { timeLeft };
        oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
        await renewTokensAndStartTimerAsync(oidc, refreshToken, false, extras);
    }, 1000);
};

export const synchroniseTokensStatus ={
    'SESSION_LOST': 'SESSION_LOST',
    'NOT_CONNECTED':'NOT_CONNECTED',
    'TOKENS_VALID':'TOKENS_VALID',
    'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID': 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID',
    'LOGOUT_FROM_ANOTHER_TAB': 'LOGOUT_FROM_ANOTHER_TAB',
    'REQUIRE_SYNC_TOKENS': 'REQUIRE_SYNC_TOKENS'
};

export const syncTokensInfoAsync = (oidc: Oidc) => async (configuration:OidcConfiguration, configurationName: string, currentTokens, forceRefresh = false) => {
    // Service Worker can be killed by the browser (when it wants,for example after 10 seconds of inactivity, so we retreieve the session if it happen)
    // const configuration = this.configuration;
    const nullNonce = { nonce: null };
    if (!currentTokens) {
        return { tokens: null, status: 'NOT_CONNECTED', nonce: nullNonce };
    }
    let nonce = nullNonce;
    const oidcServerConfiguration = await oidc.initAsync(configuration.authority, configuration.authority_configuration);
    const serviceWorker = await initWorkerAsync(configuration, configurationName);
    if (serviceWorker) {
        const { status, tokens } = await serviceWorker.initAsync(oidcServerConfiguration, 'syncTokensAsync', configuration);
        if (status === 'LOGGED_OUT') {
            return { tokens: null, status: 'LOGOUT_FROM_ANOTHER_TAB', nonce: nullNonce };
        } else if (status === 'SESSIONS_LOST') {
            return { tokens: null, status: 'SESSIONS_LOST', nonce: nullNonce };
        } else if (!status || !tokens) {
            return { tokens: null, status: 'REQUIRE_SYNC_TOKENS', nonce: nullNonce };
        } else if (tokens.issuedAt !== currentTokens.issuedAt) {
            const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
            const status = (timeLeft > 0) ? 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID' : 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID';
            const nonce = await serviceWorker.getNonceAsync();
            return { tokens, status, nonce };
        }
        nonce = await serviceWorker.getNonceAsync();
    } else {
        const session = initSession(configurationName, configuration.storage ?? sessionStorage);
        const { tokens, status } = await session.initAsync();
        if (!tokens) {
            return { tokens: null, status: 'LOGOUT_FROM_ANOTHER_TAB', nonce: nullNonce };
        } else if (status === 'SESSIONS_LOST') {
            return { tokens: null, status: 'SESSIONS_LOST', nonce: nullNonce };
        } else if (tokens.issuedAt !== currentTokens.issuedAt) {
            const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, tokens.expiresAt);
            const status = (timeLeft > 0) ? 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID' : 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID';
            const nonce = await session.getNonceAsync();
            return { tokens, status, nonce };
        }
        nonce = await session.getNonceAsync();
    }

    const timeLeft = computeTimeLeft(configuration.refresh_time_before_tokens_expiration_in_second, currentTokens.expiresAt);
    const status = (timeLeft > 0) ? 'TOKENS_VALID' : 'TOKENS_INVALID';
    if (forceRefresh) {
        return { tokens: currentTokens, status: 'FORCE_REFRESH', nonce };
    }
    return { tokens: currentTokens, status, nonce };
}