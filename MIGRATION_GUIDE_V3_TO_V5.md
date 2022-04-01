# Migrate from v3 to v5

V4 is a complete rewrite. It uses the libraries ["App-AuthJS"](https://github.com/openid/AppAuth-JS) instead of oidc-client.
In the v4 we have chosen to remove a lot the surface API in order to simplify usage and enforce security.

- Packages
  - [`@axa-fr/react-oidc-context`](./packages/context#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context)
  - [`@axa-fr/vanilla-oidc`](./packages/vanilla#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Fvanilla-oidc.svg)](https://badge.fury.io/js/%40axa-fr%2Fvanilla-oidc)
  - [`@axa-fr/react-oidc-context-fetch`](./packages/context-fetch#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context-fetch.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context-fetch) **Deprecated in v4**
  - [`@axa-fr/react-oidc-redux`](./packages/redux#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux) **Deprecated in v4 : use react-oidc-context which works with redux and in fact does not use any react context**
  - [`@axa-fr/react-oidc-redux-fetch`](./packages/redux-fetch#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux-fetch.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux-fetch) **Deprecated in v4**
  - [`@axa-fr/react-oidc-fetch-observable`](./packages/fetch-observable#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-fetch-observable.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-fetch-observable) **Deprecated in v4**

Migration PullRequest sample : https://github.com/samuel-gomez/react-starter-toolkit/pull/36


Main provider component have been renamed
```javascript
import { AuthenticationProvider } from '@axa-fr/react-oidc-context';

// old v3 

<AuthenticationProvider configuration={oidcConfiguration} loggerLevel={oidcLog.DEBUG}>
</AuthenticationProvider>

// in v4 become

import { OidcProvider } from '@axa-fr/react-oidc-context';

//loggerLevel : Logger property has been removed in v4
<OidcProvider configuration={oidcConfiguration}>
</OidcProvider>
```

Provider properties have changed, you need to keep only required properties for v4 else it won't work.
```javascript
// old v3 
const propTypes = {
  notAuthenticated: PropTypes.elementType, // react component displayed during authentication
  notAuthorized: PropTypes.elementType, // react component displayed in case user is not Authorised
  authenticating: PropTypes.elementType, // react component displayed when about to redirect user to be authenticated
  callbackComponentOverride: PropTypes.elementType, // react component displayed when user is connected
  sessionLostComponent: PropTypes.elementType, // react component displayed when user loose authentication session
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client configuration, the same as oidc client library used internally https://github.com/IdentityModel/oidc-client-js
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool, //optional, by default to true
    loadUserInfo: PropTypes.bool, //optional, by default to true
    post_logout_redirect_uri: PropTypes.string, // optional
    metadata: PropTypes.shape({
      issuer: PropTypes.string,
      jwks_uri: PropTypes.string,
      authorization_endpoint: PropTypes.string,
      token_endpoint: PropTypes.string,
      userinfo_endpoint: PropTypes.string,
      end_session_endpoint: PropTypes.string,
      revocation_endpoint: PropTypes.string,
      introspection_endpoint: PropTypes.string,
    }),
  }).isRequired,
  isEnabled: PropTypes.bool, // enable/disable the protections and trigger of authentication (useful during development).
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired,
  }),
  UserStore: PropTypes.func,
};

// new v4 
const propTypes = {
  loadingComponent: PropTypes.elementType, // you can inject your own loading component
  sessionLostComponent: PropTypes.elementType, // you can inject your own session lost component
  authenticating: PropTypes.elementType, // you can inject your own authenticationg component
  callbackSuccessComponent: PropTypes.elementType, // you can inject your own call back success component
  callbackErrorComponent: PropTypes.elementType, // you can inject your own call back error component
  serviceWorkerNotSupportedComponent: PropTypes.elementType, // you can inject your page that explain your require a more modern browser
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client id
    redirect_uri: PropTypes.string.isRequired, // oidc redirect url
    silent_redirect_uri: PropTypes.string, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore sessions
    scope: PropTypes.string.isRequired, // oidc scope (you need to set "offline_access")
    authority: PropTypes.string.isRequired,
    refresh_time_before_tokens_expiration_in_second: PropTypes.number,
    service_worker_relative_url: PropTypes.string,
    service_worker_only: PropTypes.boolean, // default false
    extras: StringMap|undefined // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that are send to the oidc server (more info: https://github.com/openid/AppAuth-JS)
  }).isRequired
};
```


Manage Oidc actions and informations

```javascript

// old v3 
import { useReactOidc } from '@axa-fr/react-oidc-context';
const  { isEnabled, login, logout, oidcUser, events } = useReactOidc(); 


// new v45
import { useOidc, useOidcAccessToken, useOidcIdToken, useOidcUser } from '@axa-fr/react-oidc-context';

const { login, logout, isAuthenticated} = useOidc(); // login and logout return a Promise
const{ oidcUser, oidcUserLoadingState } = useOidcUser(); // Return user_info endpoint data
const{ accessToken, accessTokenPayload } = useOidcAccessToken(); // Contain access_token metadata acess_token is a jwk
const{ idToken, idTokenPayload } = useOidcIdToken(); // contain IDToken metadata
 
 ```
```javascript

// old v3 
import { withFetchRedirectionOn401,
         withFetchSilentAuthenticateAndRetryOn401,
         withFetchRedirectionOn403,
         withAuthentication } from '@axa-fr/react-oidc-context-fetch';


// new v4
import { withOidcFetch } from '@axa-fr/react-oidc-context';


// withFetchRedirectionOn401 : removed, you have to implement your own 401 management
// withFetchSilentAuthenticateAndRetryOn401 : removed, not necessary in v4 token are in auto refresh mode only
// withFetchRedirectionOn403 : removed, you have to implement your own 403 management
// withAuthentication : removed

// withFetchToken in v3 have been rename to withOidcFetch and set inside  '@axa-fr/react-oidc-context' package
withOidcFetch(</MyComponent/>)

 
```

If you need a very secure mode where refresh_token and access_token will be hide behind a service worker that will proxify requests.

Add a copy task in order to install and stay up to date an Oidc Service Worker.
The only file you should edit is "OidcTrustedDomains.js" which will never be erased with the configuration bellow.

```sh
#package.json
{
    "scripts": {
        "copy": "copyfiles -f ./node_modules/@axa-fr/react-oidc-context/dist/OidcServiceWorker.js ./public && copyfiles -f -s ./node_modules/@axa-fr/react-oidc-context/dist/OidcTrustedDomains.js ./public",
        "start:server": "react-scripts start",
        "build:server": "npm run copy && react-scripts build",
        "prepare": "npm run copy"
    }
}
```

Then edit OidcTrustedDomains.js in "public" folder for your need

```javascript
// OidcTrustedDomains.js
// Add here trusted domains, access tokens will be send to
const trustedDomains = {
    default:["http://localhost:4200"],
};
```


In case v4 does not implement all features that you are using or this migration guide enought complete.

Please make issues or PullRequest in order to help to complete it !


