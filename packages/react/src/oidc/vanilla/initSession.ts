export const initSession = (configurationName) => {

    const saveItemsAsync =(items) =>{
        sessionStorage[`oidc_items.${configurationName}`] = JSON.stringify(items);
        return Promise.resolve();
    }

    const loadItemsAsync=() =>{
        return Promise.resolve(JSON.parse(sessionStorage[`oidc_items.${configurationName}`]));
    }

    const clearAsync=() =>{
        sessionStorage[`oidc.${configurationName}`] = JSON.stringify({tokens:null});
        return Promise.resolve();
    }

    const initAsync=async () => {
        if(!sessionStorage[`oidc.${configurationName}`]){
            sessionStorage[`oidc.${configurationName}`] = JSON.stringify({tokens:null});
        }
        return Promise.resolve({ tokens : JSON.parse(sessionStorage[`oidc.${configurationName}`]).tokens });
    }

    const setTokens = (tokens) => {
        sessionStorage[`oidc.${configurationName}`] = JSON.stringify({tokens});
    }

    const getTokens = () => {
        if(!sessionStorage[`oidc.${configurationName}`]){
            return null;
        }
        return JSON.stringify({ tokens : JSON.parse(sessionStorage[`oidc.${configurationName}`]).tokens });
    }

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, setTokens, getTokens };
}
