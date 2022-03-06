function get_browser() {
    console.log(navigator.userAgent);
    let ua = navigator.userAgent, tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name:'ie',version:(tem[1]||'')};
    }
    if(M[1]==='Chrome'){
        tem=ua.match(/\bOPR|Edge\/(\d+)/);
       
        if(tem!=null) {
            let version = tem[1];
            if(!version){
                const splits = ua.split(tem[0]+"/");
                if(splits.length>1){
                    version = splits[1];
                }
            }
            
            return {name:'opera', version};
        }
    }
    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
    return {
        name: M[0].toLowerCase(),
        version: M[1]
    };
}

let keepAliveServiceWorkerTimeoutId = null;

const keepAlive = () => {
    console.log('/OidcKeepAliveServiceWorker.json');
    fetch('/OidcKeepAliveServiceWorker.json').then(() => {
        keepAlive();
    })
}

const keepAliveServiceWorker = () => {
    if(keepAliveServiceWorkerTimeoutId == null) {
        keepAliveServiceWorkerTimeoutId = "not_null";
        keepAlive();
    }
}

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
    const {name, version} = get_browser();
    if(name == "firefox"){
        return null;
    }
    if(name == "chrome" && parseInt(version)<90){
        return null;
    }
    if(name == "opera"){
        if(!version) {
            return null;
        }
        if(parseInt(version.split(".")[0])< 80) {
            return null;
        }
    }
    if(name == "ie"){
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
    const initAsync= async (oidcServerConfiguration, where) => {
        
        const result = await sendMessageAsync(registration)({
            type: "init",
            data: {oidcServerConfiguration, where},
            configurationName
        });
        // @ts-ignore
        return { tokens : result.tokens, isUpdateDetected };
    }
    keepAliveServiceWorker();

    return { saveItemsAsync, loadItemsAsync, clearAsync, initAsync, getAccessTokenPayloadAsync, updateAsync };
}
