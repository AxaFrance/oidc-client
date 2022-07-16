export const initSession = (configurationName, storage=sessionStorage) => {

    const saveItemsAsync =(items) =>{
        storage[`oidc_items.${configurationName}`] = JSON.stringify(items);
        return Promise.resolve();
    }

    const loadItemsAsync=() =>{
        return Promise.resolve(JSON.parse(storage[`oidc_items.${configurationName}`]));
    }

    const clearAsync=() =>{
        storage[`oidc.${configurationName}`] = JSON.stringify({tokens:null});
        return Promise.resolve();
    }

    const initAsync=async () => {
        if(!storage[`oidc.${configurationName}`]){
            storage[`oidc.${configurationName}`] = JSON.stringify({tokens:null});
        }
        return Promise.resolve({ tokens : JSON.parse(storage[`oidc.${configurationName}`]).tokens });
    }

    const setTokens = (tokens) => {
        storage[`oidc.${configurationName}`] = JSON.stringify({tokens});
    }

    const setSessionState = (sessionState) => {
        storage[`oidc.session_state.${configurationName}`] = sessionState;
    }
    
    const getSessionState= () =>{
        return storage[`oidc.session_state.${configurationName}`];
    }

    const getTokens = () => {
        if(!storage[`oidc.${configurationName}`]){
            return null;
        }
        return JSON.stringify({ tokens : JSON.parse(storage[`oidc.${configurationName}`]).tokens });
    }

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, setTokens, getTokens, setSessionState, getSessionState };
}
