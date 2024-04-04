import Oidc from "./oidc";
import {fetchWithTokens} from "./fetch";

export const userInfoAsync = (oidc:Oidc) => async (noCache = false, demonstrating_proof_of_possession=false) => {
    if (oidc.userInfo != null && !noCache) {
        return oidc.userInfo;
    }
    const configuration = oidc.configuration;
    const oidcServerConfiguration = await oidc.initAsync(configuration.authority, configuration.authority_configuration);
    const url = oidcServerConfiguration.userInfoEndpoint;
    const fetchUserInfo = async () => {
        const oidcFetch = fetchWithTokens(fetch, oidc, demonstrating_proof_of_possession);
        const response = await oidcFetch(url);
        if (response.status !== 200) {
            return null;
        }
        return response.json();
    };
    const userInfo = await fetchUserInfo();
    oidc.userInfo = userInfo;
    return userInfo;
};
