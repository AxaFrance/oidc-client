import { sleepAsync } from './initWorker.js';
import { isTokensValid } from './parseTokens.js';

export const userInfoAsync = async (oidc) => {
    if (oidc.userInfo != null) {
        return oidc.userInfo;
    }

    // We wait the synchronisation before making a request
    while (oidc.tokens && !isTokensValid(oidc.tokens)) {
        await sleepAsync(200);
    }

    if (!oidc.tokens) {
        return null;
    }
    const accessToken = oidc.tokens.accessToken;
    if (!accessToken) {
        return null;
    }

    const oidcServerConfiguration = await oidc.initAsync(oidc.configuration.authority, oidc.configuration.authority_configuration);
    const url = oidcServerConfiguration.userInfoEndpoint;
    const fetchUserInfo = async (accessToken) => {
        const res = await fetch(url, {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });

        if (res.status !== 200) {
            return null;
        }

        return res.json();
    };
    const userInfo = await fetchUserInfo(accessToken);
    oidc.userInfo = userInfo;
    return userInfo;
};
