
const handleInstall = () => {
    console.log('[SWOPR] service worker installed');
    self.skipWaiting();
};

const handleActivate = () => {
    console.log('[SWOPR] service worker activated');
    return self.clients.claim();
};

let tokens = null;
let items = [];

const domainsToSendTokens = [
    "https://demo.identityserver.io/connect/userinfo",
]

const refreshTokenUrl = "https://demo.identityserver.io/connect/token";

function hideTokens() {
    return async (response) => {
        //console.log('response: ', response);
        tokens = await response.json()
        //console.log('response.body: ', tokens);

        const secureTokens = {
            ...tokens,
            access_token: "ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
            refresh_token: "REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER"
        };
        const body = JSON.stringify(secureTokens)
        const newResponse = new Response(body, response)
        return newResponse;
    };
}

const handleFetch = async (event) => {
    const originalRequest = event.request;
    domainsToSendTokens.forEach(domain => {
        if(originalRequest.url.startsWith(domain)) {
            const newRequest =new Request(originalRequest, {
                headers: {
                    ...originalRequest.headers,
                    authorization: "Bearer " + tokens.access_token
                }
            })
            event.waitUntil(event.respondWith(fetch(newRequest)));
        }
    });
    
    if(event.request.method !== "POST"){
        return;
    }
    
    if(originalRequest.url.startsWith(refreshTokenUrl)) {
        if (tokens != null) {
            const response =originalRequest.text().then(actualBody => {
                const newBody = actualBody.replace('REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER', encodeURIComponent(tokens.refresh_token))
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


addEventListener('message', event => {
    const data =event.data;
    switch (data.type){
        case "loadItems":
            event.ports[0].postMessage(items);
            return;
        case "clear":
            tokens = null;
            items = null;
            event.ports[0].postMessage("ok");
            return;
        default:
          items = data.data;
          event.ports[0].postMessage("ok");
          return;
    }
});
