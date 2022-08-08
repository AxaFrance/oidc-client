import timer from "./timer"
import {parseOriginalTokens} from "./parseTokens";


export const getOperatingSystem = () => {
    const nVer = navigator.appVersion;
    const nAgt = navigator.userAgent;
    const unknown = '-';
    // system
    let os = unknown;
    const clientStrings = [
        {s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/},
        {s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/},
        {s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/},
        {s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/},
        {s: 'Windows Vista', r: /Windows NT 6.0/},
        {s: 'Windows Server 2003', r: /Windows NT 5.2/},
        {s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/},
        {s: 'Windows 2000', r: /(Windows NT 5.0|Windows 2000)/},
        {s: 'Windows ME', r: /(Win 9x 4.90|Windows ME)/},
        {s: 'Windows 98', r: /(Windows 98|Win98)/},
        {s: 'Windows 95', r: /(Windows 95|Win95|Windows_95)/},
        {s: 'Windows NT 4.0', r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/},
        {s: 'Windows CE', r: /Windows CE/},
        {s: 'Windows 3.11', r: /Win16/},
        {s: 'Android', r: /Android/},
        {s: 'Open BSD', r: /OpenBSD/},
        {s: 'Sun OS', r: /SunOS/},
        {s: 'Chrome OS', r: /CrOS/},
        {s: 'Linux', r: /(Linux|X11(?!.*CrOS))/},
        {s: 'iOS', r: /(iPhone|iPad|iPod)/},
        {s: 'Mac OS X', r: /Mac OS X/},
        {s: 'Mac OS', r: /(Mac OS|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/},
        {s: 'QNX', r: /QNX/},
        {s: 'UNIX', r: /UNIX/},
        {s: 'BeOS', r: /BeOS/},
        {s: 'OS/2', r: /OS\/2/},
        {s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/}
    ];
    for (const id in clientStrings) {
        const cs = clientStrings[id];
        if (cs.r.test(nAgt)) {
            os = cs.s;
            break;
        }
    }

    let osVersion = unknown;

    if (/Windows/.test(os)) {
        osVersion = /Windows (.*)/.exec(os)[1];
        os = 'Windows';
    }

    switch (os) {
        case 'Mac OS':
        case 'Mac OS X':
        case 'Android':
            osVersion = /(?:Android|Mac OS|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh) ([\.\_\d]+)/.exec(nAgt)[1];
            break;

        case 'iOS':
            const osVersionArray = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
            osVersion = osVersionArray[1] + '.' + osVersionArray[2] + '.' + (parseInt(osVersionArray[3]) | 0);
            break;
    }
    return {
        os: os,
        osVersion: osVersion
    }
}

function getBrowser() {
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
    fetch('/OidcKeepAliveServiceWorker.json');
    sleepAsync(230*1000).then(keepAlive);
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
    const {name, version} = getBrowser();
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
    
    const unregisterAsync = async () => {
        return await registration.unregister();
    }
    
    const clearAsync=(status) =>{
        return sendMessageAsync(registration)({type: "clear", data: {status}, configurationName});
    }
    const initAsync= async (oidcServerConfiguration, where) => {
        const result = await sendMessageAsync(registration)({
            type: "init",
            data: {oidcServerConfiguration, where},
            configurationName
        });
        // @ts-ignore
        return { tokens : parseOriginalTokens(result.tokens), status: result.status};
    }
    
    const startKeepAliveServiceWorker = () => {
        if (keepAliveServiceWorkerTimeoutId == null) {
            keepAliveServiceWorkerTimeoutId = "not_null";
            keepAlive();
        }
    }

    const setSessionStateAsync = (sessionState) => {
        return sendMessageAsync(registration)({type: "setSessionState", data: {sessionState}, configurationName});
    }

    const getSessionStateAsync= async () => {
        const result = await sendMessageAsync(registration)({type: "getSessionState", data: null, configurationName});
        // @ts-ignore
        return result.sessionState;
    }

    return { 
        saveItemsAsync, 
        loadItemsAsync, 
        clearAsync, 
        initAsync, 
       // getAccessTokenPayloadAsync,
        startKeepAliveServiceWorker,
        isServiceWorkerProxyActiveAsync,
        setSessionStateAsync,
        getSessionStateAsync,
        unregisterAsync,
    };
}
