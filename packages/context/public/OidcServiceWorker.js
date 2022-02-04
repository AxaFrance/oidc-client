
const handleInstall = () => {
    console.log('[SWOPR] service worker installed');
    self.skipWaiting();
};

const handleActivate = () => {
    console.log('[SWOPR] service worker activated');
    return self.clients.claim();
};

let tokens = null;

const domainsToSendTokens = [
    "https://demo.identityserver.io/connect/userinfo",
]

const refreshTokenUrl = "https://demo.identityserver.io/connect/token";

const handleFetch = async (event) => {
    const originalRequest = event.request;
    console.log('request: ', originalRequest);
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
            const actualBody = await event.request.json()
            console.log("actualBody")
            console.log(actualBody)
            const newRequest = new Request(originalRequest, {
                body: {...actualBody, refreshToken: tokens.refreshToken},
                headers: {
                    ...originalRequest.headers,
                    authorization: "Bearer " + tokens.access_token
                }
            });
            event.waitUntil(event.respondWith(fetch(newRequest)));
        } else {
            const response = fetch(event.request).then(async (response) => {
                console.log('response: ', response);
                tokens = await response.json()
                console.log('response.body: ', tokens);

                const secureTokens = {...tokens, access_token: "$(access_token)", refresh_token: "$(refresh_token)"};
                const body = JSON.stringify(secureTokens)
                const newResponse = new Response(body, response)
                return newResponse;
            });
            event.waitUntil(event.respondWith(response));


        }

    }
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);


addEventListener('message', event => {
    // event is an ExtendableMessageEvent object
    console.log(`The client sent me a message: ${event.data}`);

    event.source.postMessage("Hi client");
});