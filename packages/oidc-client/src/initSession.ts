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
        storage[`oidc.nonce.${configurationName}`] = nonce.nonce;
    };

    const setDemonstratingProofOfPossessionJwkAsync = (jwk:JsonWebKey) => {
        storage[`oidc.jwk.${configurationName}`] = JSON.stringify(jwk);
    };

    const getDemonstratingProofOfPossessionJwkAsync = () => {
        return JSON.parse(storage[`oidc.jwk.${configurationName}`]);
    };

    const getNonceAsync = async (): Promise<string | undefined> => {
        return storage[`oidc.nonce.${configurationName}`];
    };

    const setDemonstratingProofOfPossessionNonce = async (dpopNonce:string) => {
        storage[`oidc.dpop_nonce.${configurationName}`] = dpopNonce;
    };

    const getDemonstratingProofOfPossessionNonce = () => {
        return storage[`oidc.dpop_nonce.${configurationName}`];
    };

    const getTokens = () => {
        if (!storage[`oidc.${configurationName}`]) {
            return null;
        }
        return JSON.stringify({ tokens: JSON.parse(storage[`oidc.${configurationName}`]).tokens });
    };

    let getLoginParamsCache = {};
    const setLoginParams = (data) => {
        getLoginParamsCache[configurationName] = data;
        storage[`oidc.login.${configurationName}`] = JSON.stringify(data);
    };
    const getLoginParams = () => {
        const dataString = storage[`oidc.login.${configurationName}`];
        
        if(!dataString){
            console.warn(`storage[oidc.login.${configurationName}] is empty, you should have an bad OIDC or code configuration somewhere.`);
            return null;
        }
        
        if (!getLoginParamsCache[configurationName]) {
            getLoginParamsCache[configurationName] = JSON.parse(dataString);
        }
        return getLoginParamsCache[configurationName];
    };

    const getStateAsync = async () => {
        return storage[`oidc.state.${configurationName}`];
    };

    const setStateAsync = async (state:string) => {
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
        setDemonstratingProofOfPossessionNonce,
        getDemonstratingProofOfPossessionNonce,
        setDemonstratingProofOfPossessionJwkAsync,
        getDemonstratingProofOfPossessionJwkAsync,
    };
};
