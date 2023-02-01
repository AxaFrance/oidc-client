
export const initSession = (configurationName, storage = sessionStorage) => {
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

    const setSessionStateAsync = async (sessionState) => {
        storage[`oidc.session_state.${configurationName}`] = sessionState;
    };

    const getSessionStateAsync = async () => {
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

    let getLoginParamsCache = null;
    const setLoginParams = (configurationName:string, data) => {
        getLoginParamsCache = data;
        storage[`oidc.login.${configurationName}`] = JSON.stringify(data);
    };
    const getLoginParams = (configurationName) => {
        const dataString = storage[`oidc.login.${configurationName}`];
        if (!getLoginParamsCache) {
            getLoginParamsCache = JSON.parse(dataString);
        }
        return getLoginParamsCache;
    };

    const getStateAsync = async () => {
        return storage[`oidc.state.${configurationName}`];
    };

    const setStateAsync = async (state) => {
        storage[`oidc.state.${configurationName}`] = state;
    };

    const getCodeVerifierAsync = async () => {
        return storage[`oidc.code_verifier.${configurationName}`];
    };

    const setCodeVerifierAsync = async (codeVerifier) => {
        storage[`oidc.code_verifier.${configurationName}`] = codeVerifier;
    };

    return {
        clearAsync,
        initAsync,
        setTokens,
        getTokens,
        setSessionStateAsync,
        getSessionStateAsync,
        setNonceAsync,
        getNonceAsync,
        setLoginParams,
        getLoginParams,
        getStateAsync,
        setStateAsync,
        getCodeVerifierAsync,
        setCodeVerifierAsync,
    };
};
