# @axa-fr/vanilla-oidc

Try the demo at https://icy-glacier-004ab4303.2.azurestaticapps.net/


- [About](#about)
- [Getting Started](#getting-started)
- [Run The Demo](#run-the-demo)
- [How It Works](#how-it-works)
- [Hash route](#Hash-route)
- [Service Worker Support](#service-worker-support)


## About

@axa-fr/vanilla-oidc is a pure OIDC client library agnostic to any framework. It is used by @axa-fr/react-oidc and can be used by any framework.

It use AppAuthJS behind the scene because it very lightweight and created by OpenID certification team. 

- **Secure** :
    - With the use of Service Worker, your tokens (refresh_token and access_token) are not accessible to the JavaScript client code (big protection against XSRF attacks)
    - OIDC using client side Code Credential Grant with PKCE only
- **Lightweight**
- **Simple** :
    - refresh_token and access_token are auto refreshed in background
    - with the use of the Service Worker, you do not need to inject the access_token in every fetch, you have only to configure `OidcTrustedDomains.js` file
- **No cookies problem** : You can disable silent signin (that internally use an iframe). For your information, your OIDC server should be in the same domain of your website in order to be able to send OIDC server cookies from your website via an internal IFRAME, else, you may encounter COOKIES problem.
- **Multiple Authentication** :
    - You can authenticate many times to the same provider with different scope (for example you can acquire a new 'payment' scope for a payment)
    - You can authenticate to multiple different providers inside the same SPA (single page application) website
- **Flexible** :
    - Work with Service Worker (more secure) and without for older browser (less secure)

![](https://github.com/AxaGuilDEv/react-oidc/blob/master/docs/img/schema_pcke_client_side_with_service_worker.png?raw=true)

The service worker catch **access_token** and **refresh_token** that will never be accessible to the client.


### Getting Started

```sh
npm install @axa-fr/vanilla-oidc --save

# If you have a "public" folder, the 2 files will be created :
# ./public/OidcServiceWorker.js <-- will be updated at each "npm install"
# ./public/OidcTrustedDomains.js <-- won't be updated if already exist
```

If you need a very secure mode where refresh_token and access_token will be hide behind a service worker that will proxify requests.
The only file you should edit is "OidcTrustedDomains.js".

```javascript
// OidcTrustedDomains.js

// Add bellow trusted domains, access tokens will automatically injected to be send to
// trusted domain can also be a path like https://www.myapi.com/users,
// then all subroute like https://www.myapi.com/useers/1 will be authorized to send access_token to.

// Domains used by OIDC server must be also declared here
const trustedDomains = {
  default: ["https://demo.duendesoftware.com", "https://www.myapi.com/users"],
};
```

The code of the demo :

```js
import { VanillaOidc } from '@axa-fr/vanilla-oidc'

export const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: window.location.origin + '/#/authentication/callback',
    silent_redirect_uri: window.location.origin + '/#/authentication/silent-callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.duendesoftware.com',
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
};

const href = window.location.href;
const vanillaOidc = VanillaOidc.getOrCreate(configuration);

console.log(href);

vanillaOidc.tryKeepExistingSessionAsync().then(() => {
    if(href.includes(configuration.redirect_uri)){
        vanillaOidc.loginCallbackAsync().then(()=>{
            window.location.href = "/";
        });
        document.body.innerHTML = `<div>
            <h1>@axa-fr/vanilla-oidc demo</h1>
            <h2>Loading</h2>
        </div>`;
        return
    }

    let tokens = vanillaOidc.tokens;

    if(tokens){

        // @ts-ignore
        window.logout = () =>  vanillaOidc.logoutAsync();
        document.body.innerHTML = `<div>
            <h1>@axa-fr/vanilla-oidc demo</h1>
            <button onclick="window.logout()">Logout</button>
            <h2>Authenticated</h2>
            <pre>${JSON.stringify(tokens,null,'\t')}</pre>
        </div>`
        
    }
    else {
        // @ts-ignore
        window.login= () =>  vanillaOidc.loginAsync("/");
        document.body.innerHTML = `<div>
            <h1>@axa-fr/vanilla-oidc demo</h1>
            <button onclick="window.login()">Login</button>
        </div>`
    }
})


```

## Run The Demo

```sh
git clone https://github.com/AxaGuilDEv/react-oidc.git
cd react-oidc/packages/vanilla-demo
npm install
npm start
# then navigate to http://localhost:3000
```

## How It Works

These components encapsulate the use of [AppAuth-JS](https://github.com/openid/AppAuth-JS) in order to hide workflow complexity.
Internally, native History API is used to be router library agnostic.
It use AppAuthJS behind the scene because it very lightweight and created by OpenID certification team. `oidc-client` used in V3 was heavy and no longer maintained.

More information about OIDC

- [French](https://medium.com/just-tech-it-now/augmentez-la-s%C3%A9curit%C3%A9-et-la-simplicit%C3%A9-de-votre-syst%C3%A8me-dinformation-avec-oauth-2-0-cf0732d71284)
- [English](https://medium.com/just-tech-it-now/increase-the-security-and-simplicity-of-your-information-system-with-openid-connect-fa8c26b99d6d)

## Hash route

`vanilla-oidc` work also with hash route.

```javascript
export const configurationIdentityServerWithHash = {
  client_id: "interactive.public.short",
  redirect_uri: window.location.origin + "#authentication-callback",
  silent_redirect_uri:
    window.location.origin + "#authentication-silent-callback",
  scope: "openid profile email api offline_access",
  authority: "https://demo.duendesoftware.com",
  refresh_time_before_tokens_expiration_in_second: 70,
  service_worker_relative_url: "/OidcServiceWorker.js",
  service_worker_only: false,
};
```

## Service Worker Support

- Firefox : tested on Firefox 98.0.2
- Chrome/Edge : tested on version upper to 90
- Opera : tested on version upper to 80
- Safari : tested on Safari/605.1.15
