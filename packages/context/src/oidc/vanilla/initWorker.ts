
export const initAsync = async(serviceWorkerRelativeUrl, isKeepServiceWorkerAlive= () => false) => {
    
    if(!navigator.serviceWorker){
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

    window.addEventListener('beforeunload', async () => {
       // @ts-ignore
        if(!isKeepServiceWorkerAlive()){
            await registration.unregister();
        }
    });

    navigator.serviceWorker.addEventListener('message', event => {
        // event is a MessageEvent object
        console.log(`The service worker sent me a message: ${event.data}`);
    });

    registration.active.postMessage("Hi service worker");
    
    return registration;
}
