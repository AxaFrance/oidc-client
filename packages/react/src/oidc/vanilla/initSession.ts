export const initSession = (configurationName, storage = sessionStorage) => {
    const saveItemsAsync = (items) => {
        storage[`oidc_items.${configurationName}`] = JSON.stringify(items);
        return Promise.resolve();
    };

    const loadItemsAsync = () => {
        return Promise.resolve(JSON.parse(storage[`oidc_items.${configurationName}`]));
    };

    const clearAsync = (status) => {
        storage[`oidc.${configurationName}`] = JSON.stringify({ tokens: null, status });
        return Promise.resolve();
    };

    const initAsync = async () => {
        if (!storage[`oidc.${configurationName}`]) {
            storage[`oidc.${configurationName}`] = JSON.stringify({ tokens: null, status: null });
            return { tokens: null, status: null };
        }
        const data = JSON.parse(storage[`oidc.${configurationName}`]);
        return Promise.resolve({ tokens: data.tokens, status: data.status });
    };

    const setTokens = (tokens) => {
        storage[`oidc.${configurationName}`] = JSON.stringify({ tokens });
    };

    const setSessionState = (sessionState) => {
        storage[`oidc.session_state.${configurationName}`] = sessionState;
    };

    const getSessionState = () => {
        return storage[`oidc.session_state.${configurationName}`];
    };

    const setNonceAsync = (nonce) => {
        localStorage[`oidc.nonce.${configurationName}`] = nonce.nonce;
    };

    const getNonceAsync = async () => {
        // @ts-ignore
        return { nonce: localStorage[`oidc.nonce.${configurationName}`] };
    };

    const getTokens = () => {
        if (!storage[`oidc.${configurationName}`]) {
            return null;
        }
        return JSON.stringify({ tokens: JSON.parse(storage[`oidc.${configurationName}`]).tokens });
    };

    const getLoginSessionKey = (configurationName:string) => {
        return `oidc_login.${configurationName}`;
    };

    const setLoginParams = (configurationName:string, data) => {
        const sessionKey = getLoginSessionKey(configurationName);
        getLoginParamsCache = data;
        storage[sessionKey] = JSON.stringify(data);
    };

    let getLoginParamsCache = null;
    const getLoginParams = (configurationName) => {
        const dataString = storage[getLoginSessionKey(configurationName)];
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
