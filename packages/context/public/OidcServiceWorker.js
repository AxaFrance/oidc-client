﻿this.importScripts('OidcTrustedDomains.js');

const handleInstall = () => {
    console.log('[OidcServiceWorker] service worker installed');
    self.skipWaiting();
};

const handleActivate = () => {
    console.log('[OidcServiceWorker] service worker activated');
    return self.clients.claim();
};

let currentLoginCallbackConfigurationName = null;
let database = {
    default: {
        configurationName: "default",
        tokens: null,
        items:[],
        oidcServerConfiguration: null
    }
};

function extractAccessTokenPayload(accessToken) {
    try{
        if (!accessToken) {
            return null;
        }
        return JSON.parse(atob(accessToken.split('.')[1]));
    } catch (e) {
        console.error(e);
    }
    return null;
}

function hideTokens(currentDatabaseElement) {
    const configurationName = currentDatabaseElement.configurationName;
    return async (response) => {
        const tokens = await response.json();
        currentDatabaseElement.tokens = tokens;
        const secureTokens = {
            ...tokens,
            access_token: "ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_"+configurationName,
            refresh_token: "REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_"+configurationName,
        };
        const body = JSON.stringify(secureTokens)
        return new Response(body, response);
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

const getCurrentDatabaseDomain = (database, url) => {
    for (const [key, currentDatabase] of Object.entries(database)) {

        const oidcServerConfiguration = currentDatabase.oidcServerConfiguration;
        const domainsToSendTokens = oidcServerConfiguration != null ? [
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

const handleFetch = async (event) => {
    const originalRequest = event.request;
    const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(database, originalRequest.url);
    if(currentDatabaseForRequestAccessToken && currentDatabaseForRequestAccessToken.tokens) {
        const newRequest = new Request(originalRequest, {
            headers: {
                ...originalRequest.headers,
                authorization: "Bearer " + currentDatabaseForRequestAccessToken.tokens.access_token
            }
        });
        event.waitUntil(event.respondWith(fetch(newRequest)));
    }

    if(event.request.method !== "POST"){
        return;
    }
    let currentDatabase = null;
    const currentDatabases = getCurrentDatabasesTokenEndpoint(database, originalRequest.url);
    const numberDatabase = currentDatabases.length;
    if(numberDatabase > 0) {
        const response =originalRequest.text().then(actualBody => {
            if(actualBody.includes('REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER')) {
                let newBody = actualBody;
                for(let i= 0;i<numberDatabase;i++){
                    const currentDb = currentDatabases[i];
                    const key = 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_'+ currentDb.configurationName;
                    if(actualBody.includes(key)) {
                        newBody = newBody.replace(key, encodeURIComponent(currentDb.tokens.refresh_token));
                        currentDatabase = currentDb;
                        break;
                    }
                }
                return fetch(originalRequest, {
                    body: newBody,
                    method: originalRequest.method,
                    headers: {
                        ...originalRequest.headers,
                        'Content-Type':'application/x-www-form-urlencoded'
                    },
                    mode: originalRequest.mode,
                    cache: originalRequest.cache,
                    redirect: originalRequest.redirect,
                    referrer: originalRequest.referrer,
                    credentials: originalRequest.credentials,
                    integrity: originalRequest.integrity
                }).then(hideTokens(currentDatabase));
            } else if(currentLoginCallbackConfigurationName){
                currentDatabase = database[currentLoginCallbackConfigurationName];
                currentLoginCallbackConfigurationName=null;
                return fetch(originalRequest,{
                    body: actualBody,
                    method: originalRequest.method,
                    headers: {
                        ...originalRequest.headers,
                        'Content-Type':'application/x-www-form-urlencoded'
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

        event.waitUntil(event.respondWith(response));
    }
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);

const ServiceWorkerVersion = "1.0.0";
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
            port.postMessage({configurationName});
            return;
        case "init":
            const ScriptVersion = data.data.ScriptVersion;
            if(ServiceWorkerVersion !== ScriptVersion) {
                console.warn(`Service worker version is ${ServiceWorkerVersion} and script version is ${ScriptVersion}, please update your service worker it may not work properly.`)
            }
            currentDatabase.oidcServerConfiguration = data.data.oidcServerConfiguration;
            const where = data.data.where;
            if(where === "loginCallbackAsync" || where === "tryKeepExistingSessionAsync") {
                currentLoginCallbackConfigurationName = configurationName;
            } else{
                currentLoginCallbackConfigurationName = null;
            }
            port.postMessage({tokens:currentDatabase.tokens, configurationName} );
            return;

        case "getAccessTokenPayload":
            const accessTokenPayload = extractAccessTokenPayload(currentDatabase.tokens.access_token);
            port.postMessage({configurationName, accessTokenPayload});
            return;
        default:
            currentDatabase.items = data.data;
            port.postMessage({configurationName});
            return;
    }
});

