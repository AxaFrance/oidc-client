
export const initAsync = async(workerRelativeUrl) => {
    const registration = await navigator.serviceWorker.register(workerRelativeUrl);

    try {
        await navigator.serviceWorker.ready
        console.log('[OidcServiceWorker] proxy server ready');
    }
    catch(err) {
        console.error('[OidcServiceWorker] error registering:', err)
    }

    window.addEventListener('beforeunload', async () => {
       // @ts-ignore
        await registration.unregister();
    });

    navigator.serviceWorker.addEventListener('message', event => {
        // event is a MessageEvent object
        console.log(`The service worker sent me a message: ${event.data}`);
    });

    registration.active.postMessage("Hi service worker");
    
    return registration;
}
