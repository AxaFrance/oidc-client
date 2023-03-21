import { initSession } from './initSession.js';
import { initWorkerAsync } from './initWorker.js';
import Oidc from './oidc.js';
import { computeTimeLeft } from './parseTokens.js';
import timer from './timer.js';
import { StringMap } from './types.js';

export async function renewTokensAndStartTimerAsync(oidc, refreshToken, forceRefresh = false, extras:StringMap = null) {
    const updateTokens = (tokens) => { oidc.tokens = tokens; };
    const { tokens, status } = await oidc.synchroniseTokensAsync(refreshToken, 0, forceRefresh, extras, updateTokens);

    const serviceWorker = await initWorkerAsync(oidc.configuration.service_worker_relative_url, oidc.configurationName);
    if (!serviceWorker) {
        const session = initSession(oidc.configurationName, oidc.configuration.storage);
        await session.setTokens(oidc.tokens);
    }

    if (!oidc.tokens) {
        await oidc.destroyAsync(status);
        return;
    }

    if (oidc.timeoutId) {
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
