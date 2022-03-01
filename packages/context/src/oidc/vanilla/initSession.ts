export const initSession = (configurationName) => {

    const saveItemsAsync =(items) =>{
        sessionStorage.items = JSON.stringify(items);
        return Promise.resolve();
    }

    const loadItemsAsync=() =>{
        return Promise.resolve(JSON.parse(sessionStorage.items));
    }

    const clearAsync=() =>{
        sessionStorage[configurationName] = JSON.stringify({tokens:null});
        return Promise.resolve();
    }

    const initAsync=async () => {
        if(!sessionStorage[configurationName]){
            sessionStorage[configurationName] = JSON.stringify({tokens:null});
        }
        return Promise.resolve({ tokens : JSON.parse(sessionStorage[configurationName]).tokens });
    }

    const setTokens = (tokens) => {
        sessionStorage[configurationName] = JSON.stringify({tokens});
    }

    const getTokens = () => {
        if(!sessionStorage[configurationName]){
            return null;
        }
        return JSON.stringify({ tokens : JSON.parse(sessionStorage[configurationName]).tokens });
    }

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, setTokens, getTokens };
}
