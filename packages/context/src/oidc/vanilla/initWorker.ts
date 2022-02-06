
export const initWorkerAsync = async(serviceWorkerRelativeUrl, service_worker_trusted_urls_relative_url, isKeepServiceWorkerAlive= () => false) => {
    
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
            return new Promise(function(resolve, reject) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = function(event) {
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        resolve(event.data);
                    }
                };
                navigator.serviceWorker.controller.postMessage({type: "saveItems", data: items}, [messageChannel.port2]);
            });
    }
    
    const loadItemsAsync=() =>{
        return new Promise(function(resolve, reject) {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };
            navigator.serviceWorker.controller.postMessage({type: "loadItems", data: null}, [messageChannel.port2]);
        });
    }

    const clearAsync=() =>{
        return new Promise(function(resolve, reject) {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };
            navigator.serviceWorker.controller.postMessage({type: "loadItems", data: null}, [messageChannel.port2]);
        });
    }

    const initAsync=(service_worker_trusted_urls_relative_url) =>{
        return new Promise(function(resolve, reject) {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };
            navigator.serviceWorker.controller.postMessage({type: "init", data: service_worker_trusted_urls_relative_url}, [messageChannel.port2]);
        });
    }
    
    await initAsync(service_worker_trusted_urls_relative_url);
    
    return { saveItemsAsync, loadItemsAsync, clearAsync };
}
