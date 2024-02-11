import { sleepAsync } from './initWorker.js';
import { isTokensValid } from './parseTokens.js';
import Oidc from "./oidc";

export const userInfoAsync = (oidc:Oidc) => async (noCache = false) => {
    if (oidc.userInfo != null && !noCache) {
        return oidc.userInfo;
    }

    // We wait the synchronisation before making a request
    while (oidc.tokens && !isTokensValid(oidc.tokens)) {
        await sleepAsync({milliseconds: 200});
    }

    if (!oidc.tokens) {
        return null;
    }
    const accessToken = oidc.tokens.accessToken;
    if (!accessToken) {
        return null;
    }

    const configuration = oidc.configuration;
    const oidcServerConfiguration = await oidc.initAsync(configuration.authority, configuration.authority_configuration);
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
