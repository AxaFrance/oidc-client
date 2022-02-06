

const sendMessageAsync = (data) =>{
    return new Promise(function(resolve, reject) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = function (event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };
        navigator.serviceWorker.controller.postMessage(data, [messageChannel.port2]);
    });
} 


export const initWorkerAsync = async(serviceWorkerRelativeUrl, oidcServerConfiguration) => {
    
    if(!navigator.serviceWorker||!serviceWorkerRelativeUrl){
        return null;
    }
    
    const registration = await navigator.serviceWorker.register(serviceWorkerRelativeUrl);

    try {
        await navigator.serviceWorker.ready
        console.log('[OidcServiceWorker] proxy server ready');
    }
    catch(err) {
        console.error('[OidcServiceWorker] error registering:', err)
        return null;
    }
    
    const saveItemsAsync =(items) =>{
            return sendMessageAsync({type: "saveItems", data: items});
    }
    
    const loadItemsAsync=() =>{
        return sendMessageAsync({type: "loadItems", data: null});
    }

    const clearAsync=() =>{
        return sendMessageAsync({type: "loadItems", data: null});
    }

    const initAsync=(oidcServerConfiguration) =>{
        const ScriptVersion = "1.0.0";
        return sendMessageAsync({type: "init", data: { oidcServerConfiguration, ScriptVersion }});
    }
    
    await initAsync(oidcServerConfiguration);
    
    return { saveItemsAsync, loadItemsAsync, clearAsync };
}
