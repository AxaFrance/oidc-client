
export const initWorkerAsync = async(serviceWorkerRelativeUrl, isKeepServiceWorkerAlive= () => false) => {
    
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

    window.addEventListener('beforeunload', async () => {
       // @ts-ignore
        if(!isKeepServiceWorkerAlive()){
            await registration.unregister();
        }
    });
    
    let items={};
    navigator.serviceWorker.addEventListener('message', event => {
        items= JSON.parse(event.data);
        // event is a MessageEvent object
        //console.log(`The service worker sent me a message: ${event.data}`);
    });

    //registration.active.postMessage("Hi service worker");
    registration.active.postMessage(JSON.stringify({name: "loadItems"}));
    const saveItems =(items) =>{
        registration.active.postMessage(JSON.stringify({name: "saveItems", items}));
    }
    
    const loadItems=() =>{
        return items;
    }
    
    return { saveItems, loadItems };
}
