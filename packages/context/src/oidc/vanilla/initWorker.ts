

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

let isUpdateDetected = false;

export const initWorkerAsync = async(serviceWorkerRelativeUrl, configurationName) => {
    
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

    const updateAsync = () =>{
        return sendMessageAsync(registration)({type: "skipWaiting", data: null, configurationName});
    }

    if (registration.waiting) {
        //await updateAsync();
    }
    
        registration.addEventListener('updatefound', () => {
            console.log('Service Worker update detected!');
            if (registration.installing) {
                // wait until the new Service worker is actually installed (ready to take over)
                registration.installing.addEventListener('statechange', () => {
                    if (registration.waiting) {
                        // if there's an existing controller (previous Service Worker), show the prompt
                        if (navigator.serviceWorker.controller) {
                            isUpdateDetected = true;
                        } else {
                            // otherwise it's the first install, nothing to do
                            console.log('Service Worker initialized for the first time')
                        }
                    }
                })
            }
        });
    
    const saveItemsAsync =(items) =>{
            return sendMessageAsync(registration)({type: "saveItems", data: items, configurationName});
    }
    
    const loadItemsAsync=() =>{
        return sendMessageAsync(registration)({type: "loadItems", data: null, configurationName});
    }

    const getAccessTokenPayloadAsync=async () => {
        const result = await sendMessageAsync(registration)({
            type: "getAccessTokenPayload",
            data: null,
            configurationName
        });
        // @ts-ignore
        return result.accessTokenPayload;
    }

    const clearAsync=() =>{
        return sendMessageAsync(registration)({type: "clear", data: null, configurationName});
    }

    const initAsync=async (oidcServerConfiguration, where) => {
        const result = await sendMessageAsync(registration)({
            type: "init",
            data: {oidcServerConfiguration, where},
            configurationName
        });
        // @ts-ignore
        return { tokens : result.tokens, isUpdateDetected };
    }    
    

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, getAccessTokenPayloadAsync, updateAsync };
}
