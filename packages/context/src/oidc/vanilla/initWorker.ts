
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

  /*  window.addEventListener('beforeunload', async () => {
       // @ts-ignore
        if(!isKeepServiceWorkerAlive()){
            await registration.unregister();
        }
    });*/
    
    let items={};
   /* navigator.serviceWorker.addEventListener('message', event => {
        console.log("loaditems")
        console.log(event.data)
        items= JSON.parse(event.data);
        // event is a MessageEvent object
        //console.log(`The service worker sent me a message: ${event.data}`);
    });*/

    //registration.active.postMessage("Hi service worker");
    //registration.active.postMessage(JSON.stringify({name: "loadItems"}));
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
       // registration.active.postMessage(JSON.stringify({name: "saveItems", items}));
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
    
    return { saveItemsAsync, loadItemsAsync, clearAsync };
}
