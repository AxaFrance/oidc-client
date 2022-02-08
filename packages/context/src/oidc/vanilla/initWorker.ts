

const sendMessageAsync = (registration) => (data) =>{
    return new Promise(function(resolve, reject) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = function (event) {
            if (event.data && event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };
        registration.active.postMessage(data, [messageChannel.port2]);
    });
} 


export const initWorkerAsync = async(serviceWorkerRelativeUrl) => {
    
    if(!navigator.serviceWorker||!serviceWorkerRelativeUrl){
        return null;
    }
    
    const registration = await navigator.serviceWorker.register(serviceWorkerRelativeUrl);

    try {
        await navigator.serviceWorker.ready
        console.log('[OidcServiceWorker] proxy server ready');
    }
    catch(err) {
        console.error('[OidcServiceWorker] error registering:', err);
        return null;
    }
    
    const saveItemsAsync =(items) =>{
            return sendMessageAsync(registration)({type: "saveItems", data: items});
    }
    
    const loadItemsAsync=() =>{
        return sendMessageAsync(registration)({type: "loadItems", data: null});
    }

    const clearAsync=() =>{
        return sendMessageAsync(registration)({type: "clear", data: null});
    }

    const initAsync=(oidcServerConfiguration) =>{
        const ScriptVersion = "1.0.0";
        return sendMessageAsync(registration)({type: "init", data: { oidcServerConfiguration, ScriptVersion }});
    }    
    
    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync };
}
