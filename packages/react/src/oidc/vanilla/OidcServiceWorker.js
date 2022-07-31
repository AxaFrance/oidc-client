this.importScripts('OidcTrustedDomains.js');

const id = Math.round(new Date().getTime() / 1000).toString();

const keepAliveJsonFilename = "OidcKeepAliveServiceWorker.json";
const handleInstall = (event) => {
    console.log('[OidcServiceWorker] service worker installed ' + id);
    event.waitUntil(self.skipWaiting());
};

const handleActivate = (event) => {
    console.log('[OidcServiceWorker] service worker activated ' + id);
    event.waitUntil(self.clients.claim());
};

let currentLoginCallbackConfigurationName = null;
let database = {
    default: {
        configurationName: "default",
        tokens: null,
        status:null,
        items:[],
        oidcServerConfiguration: null
    }
};

const countLetter = (str, find)=> {
    return (str.split(find)).length - 1;
}

const extractTokenPayload=(accessToken)=> {
    try{
        if (!accessToken) {
            return null;
        }
        if(countLetter(accessToken,'.') === 2) {
            return JSON.parse(atob(accessToken.split('.')[1]));
        } else {
            return null;
        }
    } catch (e) {
        console.warn(e);
    }
    return null;
}

const computeTimeLeft = (refreshTimeBeforeTokensExpirationInSecond, expiresAt)=>{
    const currentTimeUnixSecond = new Date().getTime() /1000;
    return Math.round(((expiresAt - refreshTimeBeforeTokensExpirationInSecond) - currentTimeUnixSecond));
}

const isTokensValid= (tokens) =>{
    if(!tokens){
        return false;
    }
    return computeTimeLeft(0, tokens.expiresAt) > 0;
}

function hideTokens(currentDatabaseElement) {
    const configurationName = currentDatabaseElement.configurationName;
    return (response) => {
        return response.json().then(tokens => {
            if(!tokens.issued_at) {
                const currentTimeUnixSecond = new Date().getTime() /1000;
                tokens.issued_at = currentTimeUnixSecond;
            }
            currentDatabaseElement.tokens = tokens;
            currentDatabaseElement.status = "LOGGED_IN";
            const accessTokenPayload = extractTokenPayload(tokens.access_token);
            const secureTokens = {
                ...tokens,
                access_token: ACCESS_TOKEN +"_" + configurationName,
                accessTokenPayload : accessTokenPayload
            };

            let _idTokenPayload = null; 
            if(tokens.id_token) {
                _idTokenPayload = extractTokenPayload(tokens.id_token);
                secureTokens.idTokenPayload = _idTokenPayload;
            }
            if(tokens.refresh_token){
                secureTokens.refresh_token = REFRESH_TOKEN + "_" + configurationName;
            }

            const idTokenExipreAt =(_idTokenPayload && _idTokenPayload.exp) ? _idTokenPayload.exp: Number.MAX_VALUE;
            const accessTokenExpiresAt =  (accessTokenPayload && accessTokenPayload.exp)? accessTokenPayload.exp : tokens.issuedAt + tokens.expiresIn;
            const expiresAt = idTokenExipreAt < accessTokenExpiresAt ? idTokenExipreAt : accessTokenExpiresAt;
            secureTokens.expiresAt = expiresAt;
            tokens.expiresAt = expiresAt;
            
            const body = JSON.stringify(secureTokens)
            return new Response(body, response);
        });
    };
}

const getCurrentDatabasesTokenEndpoint = (database, url) => {
    const databases = [];
    for (const [key, value] of Object.entries(database)) {
        if(value && value.oidcServerConfiguration !=null && url.startsWith(value.oidcServerConfiguration.tokenEndpoint)){
            databases.push(value);
        }
    }
    return databases;
}

const openidWellknownUrlEndWith  = "/.well-known/openid-configuration"
const getCurrentDatabaseDomain = (database, url) => {
    if(url.endsWith(openidWellknownUrlEndWith)){
        return null;
    }
    for (const [key, currentDatabase] of Object.entries(database)) {
        const oidcServerConfiguration = currentDatabase.oidcServerConfiguration;
        
        if(!oidcServerConfiguration){
            continue;
        }
        
        if(oidcServerConfiguration.tokenEndpoint && url === oidcServerConfiguration.tokenEndpoint){
            continue;
        }

        const domainsToSendTokens = oidcServerConfiguration.userInfoEndpoint ? [
            oidcServerConfiguration.userInfoEndpoint, ...trustedDomains[key]
        ] : [...trustedDomains[key]];

        let hasToSendToken = false;
        for(let i=0;i<domainsToSendTokens.length;i++) {
            const domain = domainsToSendTokens[i];
            if (url.startsWith(domain)) {
                hasToSendToken = true;
                break;
            }
        }

        if(hasToSendToken){
            if(!currentDatabase.tokens) {
                return null;
            }
            return currentDatabase;
        }
    }

    return null;
}

const serializeHeaders = (headers) => {
    let headersObj = {};
    for (let key of headers.keys()) {
        headersObj[key] = headers.get(key);
    }
    return headersObj;
};

const REFRESH_TOKEN = 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER';
const ACCESS_TOKEN = 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const keepAliveAsync = async (event) => {
    const originalRequest = event.request;
    const isFromVanilla = originalRequest.headers.has('oidc-vanilla');
    const init = {"status": 200, "statusText": 'oidc-service-worker'};
    const response = new Response('{}', init);
    if(!isFromVanilla) {
        for(let i=0; i<240;i++){
            await sleep(1000 + Math.floor(Math.random() * 1000));
            const cache = await caches.open("oidc_dummy_cache");
            await cache.put(event.request, response.clone());
        }
    }

    return response;
}

const handleFetch = async (event) => {
    const originalRequest = event.request;

    if(originalRequest.url.includes(keepAliveJsonFilename) ){
        event.respondWith(keepAliveAsync(event));
        return;
    }

    const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(database, originalRequest.url);
    if(currentDatabaseForRequestAccessToken && currentDatabaseForRequestAccessToken.tokens) {

        while (currentDatabaseForRequestAccessToken.tokens && !isTokensValid(currentDatabaseForRequestAccessToken.tokens)){
            await sleep(200);
        } 
        const newRequest = new Request(originalRequest, {
            headers: {
                ...serializeHeaders(originalRequest.headers),
                authorization: "Bearer " + currentDatabaseForRequestAccessToken.tokens.access_token
            }
        });
        event.waitUntil(event.respondWith(fetch(newRequest)));
        return;
    }

    if(event.request.method !== "POST"){
        return;
    }
    let currentDatabase = null;
    const currentDatabases = getCurrentDatabasesTokenEndpoint(database, originalRequest.url);
    const numberDatabase = currentDatabases.length;
    if(numberDatabase > 0) {
        const maPromesse = new Promise((resolve, reject) => {
            const response = originalRequest.clone().text().then(actualBody => {
                if(actualBody.includes(REFRESH_TOKEN)) {
                    let newBody = actualBody;
                    for(let i= 0;i<numberDatabase;i++){
                        const currentDb = currentDatabases[i];
                        const key = REFRESH_TOKEN + '_'+ currentDb.configurationName;
                        if(currentDb && currentDb.tokens != null && actualBody.includes(key)) {
                            newBody = newBody.replace(key, encodeURIComponent(currentDb.tokens.refresh_token));
                            currentDatabase = currentDb;
                            break;
                        }
                    }
                    
                    return fetch(originalRequest, {
                        body: newBody,
                        method: originalRequest.method,
                        headers: {
                            ...serializeHeaders(originalRequest.headers),
                        },
                        mode: originalRequest.mode,
                        cache: originalRequest.cache,
                        redirect: originalRequest.redirect,
                        referrer: originalRequest.referrer,
                        credentials: originalRequest.credentials,
                        integrity: originalRequest.integrity
                    }).then(hideTokens(currentDatabase));
                } else if(actualBody.includes("code_verifier=") && currentLoginCallbackConfigurationName){
                    currentDatabase = database[currentLoginCallbackConfigurationName];
                    currentLoginCallbackConfigurationName=null;
                    return fetch(originalRequest,{
                        body: actualBody,
                        method: originalRequest.method,
                        headers: {
                            ...serializeHeaders(originalRequest.headers),
                        },
                        mode: originalRequest.mode,
                        cache: originalRequest.cache,
                        redirect: originalRequest.redirect,
                        referrer: originalRequest.referrer,
                        credentials: originalRequest.credentials,
                        integrity: originalRequest.integrity
                    }).then(hideTokens(currentDatabase));
                }
            });
            response.then(r => {
                if(r !== undefined){
                    resolve(r);
                } else{
                    console.log("success undefined");
                    reject(new Error("Response is undefined inside a success"));
                }
            }).catch(err => {
                if(err !== undefined) {
                    reject(err);
                } else{
                    console.log("error undefined");
                    reject(new Error("Response is undefined inside a error"));
                }
            });
        });
        event.waitUntil(event.respondWith(maPromesse));
    }
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);


const checkDomain =(domains, tokenEndpoint) => {
    
    if(!tokenEndpoint){
        return;
    }
    
    const domain = domains.find(domain => tokenEndpoint.startsWith(domain));
    if(!domain){
        throw new Error("Domain " + tokenEndpoint+ " is not trusted, please add domain in TrustedDomains.js");
    }
}

addEventListener('message', event => {
    const port = event.ports[0];
    const data = event.data;
    const configurationName = data.configurationName;
    let currentDatabase = database[configurationName];

    if(!currentDatabase){
        database[configurationName] = {
            tokens: null,
            items:[],
            oidcServerConfiguration: null,
            status:null,
            configurationName: configurationName,
        };
        currentDatabase = database[configurationName];
        if(!trustedDomains[configurationName]) {
            trustedDomains[configurationName] = [];
        }
    }
    switch (data.type){
        case "loadItems":
            port.postMessage(database[configurationName].items);
            return;
        case "clear":
            currentDatabase.tokens = null;
            currentDatabase.items = null;
            currentDatabase.status = data.data.status;
            port.postMessage({configurationName});
            return;
        case "init":
            const oidcServerConfiguration = data.data.oidcServerConfiguration;
            const tokenEndpoint = oidcServerConfiguration.tokenEndpoint;
            const domains = trustedDomains[configurationName];
            checkDomain(domains, tokenEndpoint);
            const userInfoEndpoint = oidcServerConfiguration.userInfoEndpoint;
            checkDomain(domains, userInfoEndpoint);
            currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
            const where = data.data.where;
            if(where === "loginCallbackAsync" || where === "tryKeepExistingSessionAsync") {
                currentLoginCallbackConfigurationName = configurationName;
            } else{
                currentLoginCallbackConfigurationName = null;
            }
            
            if(!currentDatabase.tokens){
                port.postMessage({
                    tokens:null,
                    status: currentDatabase.status,
                    configurationName});
            } else {
                const tokens = {
                    ...currentDatabase.tokens,
                    access_token: ACCESS_TOKEN + "_" + configurationName
                };
                if(tokens.refresh_token){
                    tokens.refresh_token = REFRESH_TOKEN + "_" + configurationName;
                }
                port.postMessage({
                    tokens,
                    status: currentDatabase.status,
                    configurationName
                });
            }
            return;
            
        case "setSessionState":
            currentDatabase.sessionState = data.data.sessionState;
            port.postMessage({configurationName});
            return;
        case "getSessionState":
            const sessionState = currentDatabase.sessionState;
            port.postMessage({configurationName, sessionState});
            return;
        default:
            currentDatabase.items = data.data;
            port.postMessage({configurationName});
            return;
    }
});

