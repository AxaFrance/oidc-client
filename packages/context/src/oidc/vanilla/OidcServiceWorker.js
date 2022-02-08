this.importScripts('OidcTrustedDomains.js');

const handleInstall = () => {
    console.log('[OidcServiceWorker] service worker installed');
    self.skipWaiting();
};

const handleActivate = () => {
    console.log('[OidcServiceWorker] service worker activated');
    return self.clients.claim();
};

let database = {
    default: {
        tokens: null,
        items:[],
        oidcServerConfiguration: null
    }
};

const accessTokenPayload = t => {
    if (!t) {
        return null;
    }
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload;
};

function hideTokens(currentDatabaseElement) {
    return async (response) => {
        
        const tokens = await response.json();
        const accessTokenPayLoad = accessTokenPayload(tokens.access_token);
        currentDatabaseElement.tokens = {...tokens, access_token_payload: accessTokenPayLoad};

        const secureTokens = {
            ...tokens,
            access_token: "ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
            refresh_token: "REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
            access_token_payload: accessTokenPayLoad
        };
        const body = JSON.stringify(secureTokens)
        const newResponse = new Response(body, response)
        return newResponse;
    };
}

const getCurrentDatabaseTokenEndpoint = (database, url) => {
    for (const [key, value] of Object.entries(database)) {
        if(value && value.oidcServerConfiguration !=null && url.startsWith(value.oidcServerConfiguration.tokenEndpoint)){
            return value;
        }
    }
    return null;
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
    const currentDatabase = getCurrentDatabaseDomain(database, originalRequest.url);
    if(currentDatabase && currentDatabase.tokens) {
        const newRequest = new Request(originalRequest, {
            headers: {
                ...originalRequest.headers,
                authorization: "Bearer " + currentDatabase.tokens.access_token
            }
        });
        event.waitUntil(event.respondWith(fetch(newRequest)));
    }

    if(event.request.method !== "POST"){
        return;
    }

    const currentDatabaseForTokenEndpoint = getCurrentDatabaseTokenEndpoint(database, originalRequest.url);
    if(currentDatabaseForTokenEndpoint) {
        if (currentDatabaseForTokenEndpoint.tokens != null) {
            const response =originalRequest.text().then(actualBody => {
                const newBody = actualBody.replace('REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER', encodeURIComponent(currentDatabaseForTokenEndpoint.tokens.refresh_token))
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
                }).then(hideTokens(currentDatabaseForTokenEndpoint));
            });
            event.waitUntil(event.respondWith(response));
        } else {
            const response = fetch(event.request).then(hideTokens(currentDatabaseForTokenEndpoint));
            event.waitUntil(event.respondWith(response));
        }
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
    const currentDatabase = database[data.configurationName];
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
            port.postMessage({tokens:currentDatabase.tokens,configurationName} );
            return;
        default:
            currentDatabase.items = data.data;
            port.postMessage({configurationName});
            return;
    }
});

