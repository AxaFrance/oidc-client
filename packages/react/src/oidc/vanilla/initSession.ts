export const initSession = (configurationName, redirectUri, storage = sessionStorage) => {
    const saveItemsAsync = (items) => {
        storage[`oidc_items.${configurationName}:${redirectUri}`] = JSON.stringify(items);
        return Promise.resolve();
    };

    const loadItemsAsync = () => {
        return Promise.resolve(JSON.parse(storage[`oidc_items.${configurationName}:${redirectUri}`]));
    };

    const clearAsync = (status) => {
        storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({ tokens: null, status });
        return Promise.resolve();
    };

    const initAsync = async () => {
        if (!storage[`oidc.${configurationName}:${redirectUri}`]) {
            storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({ tokens: null, status: null });
            return { tokens: null, status: null };
        }
        const data = JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]);
        return Promise.resolve({ tokens: data.tokens, status: data.status });
    };

    const setTokens = (tokens) => {
        storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({ tokens });
    };

    const setSessionState = (sessionState) => {
        storage[`oidc.session_state.${configurationName}:${redirectUri}`] = sessionState;
    };

    const getSessionState = () => {
        return storage[`oidc.session_state.${configurationName}:${redirectUri}`];
    };

    const setNonceAsync = (nonce) => {
        localStorage[`oidc.nonce.${configurationName}:${redirectUri}`] = nonce.nonce;
    };

    const getNonceAsync = async () => {
        // @ts-ignore
        return { nonce: localStorage[`oidc.nonce.${configurationName}:${redirectUri}`] };
    };

    const getTokens = () => {
        if (!storage[`oidc.${configurationName}:${redirectUri}`]) {
            return null;
        }
        return JSON.stringify({ tokens: JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]).tokens });
    };

    const getLoginSessionKey = (configurationName:string, redirectUri:string) => {
        return `oidc_login.${configurationName}:${redirectUri}`;
    };

    const setLoginParams = (configurationName:string, redirectUri:string, data) => {
        const sessionKey = getLoginSessionKey(configurationName, redirectUri);
        getLoginParamsCache = data;
        storage[sessionKey] = JSON.stringify(data);
    };

    let getLoginParamsCache = null;
    const getLoginParams = (configurationName, redirectUri) => {
        const dataString = storage[getLoginSessionKey(configurationName, redirectUri)];
        if (!getLoginParamsCache) {
            getLoginParamsCache = JSON.parse(dataString);
        }
        return getLoginParamsCache;
    };

    return {
        saveItemsAsync,
        loadItemsAsync,
        clearAsync,
        initAsync,
        setTokens,
        getTokens,
        setSessionState,
        getSessionState,
        setNonceAsync,
        getNonceAsync,
        setLoginParams,
        getLoginParams,
    };
};
