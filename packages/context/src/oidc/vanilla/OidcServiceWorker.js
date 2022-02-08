this.importScripts('OidcTrustedDomains.js');

const handleInstall = () => {
    console.log('[SWOPR] service worker installed');
    self.skipWaiting();
};

const handleActivate = () => {
    console.log('[SWOPR] service worker activated');
    return self.clients.claim();
};

let database = {
    default: {
        tokens: null,
        items:[],
        oidcServerConfiguration: null
    }    
};

function hideTokens() {
    return async (response) => {
        database.default.tokens = await response.json()

        const secureTokens = {
            ...database.default.tokens,
            access_token: "ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
            refresh_token: "REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER"
        };
        const body = JSON.stringify(secureTokens)
        const newResponse = new Response(body, response)
        return newResponse;
    };
}

const handleFetch = async (event) => {
    const currentDatabase = database.default;
    const oidcServerConfiguration = database.default.oidcServerConfiguration;
    
    const domainsToSendTokens = oidcServerConfiguration != null ? [
        oidcServerConfiguration.userInfoEndpoint, ...trustedDomains.default
    ] : [...trustedDomains.default];
    
    const originalRequest = event.request;
    domainsToSendTokens.forEach(domain => {
        if(originalRequest.url.startsWith(domain)) {
            const newRequest = new Request(originalRequest, {
                headers: {
                    ...originalRequest.headers,
                    authorization: "Bearer " + currentDatabase.tokens.access_token
                }
            });
            event.waitUntil(event.respondWith(fetch(newRequest)));
        }
    });
    
    if(event.request.method !== "POST"){
        return;
    }
    
    if(oidcServerConfiguration === null){
        return;
    }
    
    if(originalRequest.url.startsWith(oidcServerConfiguration.tokenEndpoint)) {
        if (currentDatabase.tokens != null) {
            const response =originalRequest.text().then(actualBody => {
                const newBody = actualBody.replace('REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER', encodeURIComponent(currentDatabase.tokens.refresh_token))
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
                }).then(hideTokens());
            });
            event.waitUntil(event.respondWith(response));
        } else {
            const response = fetch(event.request).then(hideTokens());
            event.waitUntil(event.respondWith(response));
        }
    }
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);

const ServiceWorkerVersion = "1.0.0";
addEventListener('message', event => {
    const currentDatabase = database.default;
    const port = event.ports[0];
    const data = event.data;
    switch (data.type){
        case "loadItems":
            port.postMessage(currentDatabase.items);
            return;
        case "clear":
            currentDatabase.tokens = null;
            currentDatabase.items = null;
            port.postMessage("ok");
            return;
        case "init":
            const ScriptVersion = data.data.ScriptVersion;
            if(ServiceWorkerVersion !== ScriptVersion) {
                console.warn(`Service worker version is ${ServiceWorkerVersion} and script version is ${ScriptVersion}, please update your service worker it may not work properly.`)
            }
            currentDatabase.oidcServerConfiguration = data.data.oidcServerConfiguration;
            port.postMessage(currentDatabase.tokens);
            return;
        default:
            currentDatabase.items = data.data;
            port.postMessage("ok");
            return;
    }
});

