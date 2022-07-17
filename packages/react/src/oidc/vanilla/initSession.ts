export const initSession = (configurationName, redirectUri, storage=sessionStorage) => {

    const saveItemsAsync =(items) =>{
        storage[`oidc_items.${configurationName}:${redirectUri}`] = JSON.stringify(items);
        return Promise.resolve();
    }

    const loadItemsAsync=() =>{
        return Promise.resolve(JSON.parse(storage[`oidc_items.${configurationName}:${redirectUri}`]));
    }

    const clearAsync=() =>{
        storage[`oidc.${configurationName}`] = JSON.stringify({tokens:null});
        return Promise.resolve();
    }

    const initAsync=async () => {
        if(!storage[`oidc.${configurationName}:${redirectUri}`]){
            storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({tokens:null});
        }
        return Promise.resolve({ tokens : JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]).tokens });
    }

    const setTokens = (tokens) => {
        storage[`oidc.${configurationName}`] = JSON.stringify({tokens});
    }

    const setSessionState = (sessionState) => {
        storage[`oidc.session_state.${configurationName}:${redirectUri}`] = sessionState;
    }
    
    const getSessionState= () =>{
        return storage[`oidc.session_state.${configurationName}:${redirectUri}`];
    }

    const getTokens = () => {
        if(!storage[`oidc.${configurationName}:${redirectUri}`]){
            return null;
        }
        return JSON.stringify({ tokens : JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]).tokens });
    }

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, setTokens, getTokens, setSessionState, getSessionState };
}
