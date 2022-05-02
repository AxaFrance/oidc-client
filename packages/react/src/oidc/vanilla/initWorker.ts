import timer from "./timer"

function get_browser() {
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

export const sleepAsync = (milliseconds) => {
    return new Promise(resolve => timer.setTimeout(resolve, milliseconds))
}

const keepAlive = () => {
    const currentTimeUnixSecond = new Date().getTime() /1000;
    fetch('/OidcKeepAliveServiceWorker.json').then(() => {
        const newTimeUnixSecond = new Date().getTime() /1000;
        if((newTimeUnixSecond - currentTimeUnixSecond) >4){
            keepAlive();   
        } else{
            // security if service worker does not catch the request
            sleepAsync(2000).then(keepAlive);
        }
    })
}

const isServiceWorkerProxyActiveAsync = () => {
    return fetch('/OidcKeepAliveServiceWorker.json', {
        headers: {
            'oidc-vanilla': "true"
        }})
        .then((response) => {
            return response.statusText === 'oidc-service-worker';
        });
};

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

export const initWorkerAsync = async(serviceWorkerRelativeUrl, configurationName) => {
    
    if(!navigator.serviceWorker||!serviceWorkerRelativeUrl){
        return null;
    }
    const {name, version} = get_browser();
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
    }
    catch(err) {
        return null;
    }
    
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
        return { tokens : result.tokens};
    }
    
    const startKeepAliveServiceWorker = () => {
        if (keepAliveServiceWorkerTimeoutId == null) {
            keepAliveServiceWorkerTimeoutId = "not_null";
            keepAlive();
        }
    }

    return { 
        saveItemsAsync, 
        loadItemsAsync, 
        clearAsync, 
        initAsync, 
        getAccessTokenPayloadAsync,
        startKeepAliveServiceWorker,
        isServiceWorkerProxyActiveAsync
    };
}
