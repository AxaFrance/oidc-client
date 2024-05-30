# @axa-fr/react-oidc

[![Continuous Integration](https://github.com/AxaFrance/react-oidc/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/AxaFrance/react-oidc/actions/workflows/npm-publish.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=alert_status)](https://sonarcloud.io/dashboard?id=AxaGuilDEv_react-oidc) [![Reliability](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=reliability_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=reliability_rating) [![Security](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=security_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=security_rating) [![Code Corevage](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=coverage)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=Coverage) [![Twitter](https://img.shields.io/twitter/follow/GuildDEvOpen?style=social)](https://twitter.com/intent/follow?screen_name=GuildDEvOpen)

**@axa-fr/oidc-client** the lightest and securest library to manage authentication with OpenID Connect (OIDC) and OAuth2 protocol. It is compatible with all OIDC providers.
**@axa-fr/oidc-client** is a pure javascript library. It works with any JavaScript framework or library.

We provide a wrapper **@axa-fr/react-oidc** for **React** (compatible next.js) and we expect soon to provide one for **Vue**, **Angular** and **Svelte**.

- Try the react demo at https://black-rock-0dc6b0d03.1.azurestaticapps.net/ (most advanced)
- Try the pure javascript demo at https://icy-glacier-004ab4303.2.azurestaticapps.net/

<p align="center">
    <img src="https://raw.githubusercontent.com/AxaFrance/oidc-client/main/docs/img/introduction.gif"
     alt="Sample React Oicd"
      />
</p>

- [About](#about)
- [Getting Started](#getting-started)
- [Run The Demo](#run-the-demo)
- [Examples](#examples)
- [How It Works](#how-it-works)
- [NextJS](#NextJS)
- [Hash route](#Hash-route)
- [Service Worker Support](#service-worker-support)

## About

@axa-fr/react is:

- **Secure** :
  - With Demonstrating Proof of Possession (DPoP), your access_token and refresh_token are not usable outside your browser context (big protection)
  - With the use of Service Worker, your tokens (refresh_token and/or access_token) are not accessible to the JavaScript client code (if you follow good practices from [`FAQ`](https://github.com/AxaFrance/oidc-client/blob/main/FAQ.md) section)
  - OIDC using client side Code Credential Grant with pkce only
- **Lightweight** : Unpacked Size on npm is **274 kB**
- **Simple**
  - refresh_token and access_token are auto refreshed in background
  - with the use of the Service Worker, you do not need to inject the access_token in every fetch, you have only to configure OidcTrustedDomains.js file
- **Multiple Authentication** :
  - You can authenticate many times to the same provider with different scope (for example you can acquire a new 'payment' scope for a payment)
  - You can authenticate to multiple different providers inside the same SPA (single page application) website
- **Flexible** :
  - Work with Service Worker (more secure) and without for older browser (less secure).
  - You can disable Service Worker if you want (but less secure) and just use SessionStorage or LocalStorage mode.

![](https://github.com/AxaGuilDEv/react-oidc/blob/master/docs/img/schema_pcke_client_side_with_service_worker.png?raw=true)

The service worker catch **access_token** and **refresh_token** that will never be accessible to the client.

## Getting Started

```sh
npm install @axa-fr/react-oidc --save

# To install or update OidcServiceWorker.js file, you can run
node ./node_modules/@axa-fr/react-oidc/bin/copy-service-worker-files.mjs public

# If you have a "public" folder, the 2 files will be created :
# ./public/OidcServiceWorker.js <-- will be updated at each "npm install"
# ./public/OidcTrustedDomains.js <-- won't be updated if already exist
```

WARNING : If you use Service Worker mode, the OidcServiceWorker.js file should always be up to date with the version of the library. You may setup a postinstall script in your package.json file to update it at each npm install. For example :

```sh
  "scripts": {
    ...
    "postinstall": "node ./node_modules/@axa-fr/react-oidc/bin/copy-service-worker-files.mjs public"
  },
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
  default: {
    oidcDomains: ['https://demo.duendesoftware.com'],
    accessTokenDomains: ['https://www.myapi.com/users'],
  },
};

// Service worker will continue to give access token to the JavaScript client
// Ideal to hide refresh token from client JavaScript, but to retrieve access_token for some
// scenarios which require it. For example, to send it via websocket connection.
trustedDomains.config_show_access_token = {
  oidcDomains: ['https://demo.duendesoftware.com'],
  accessTokenDomains: ['https://www.myapi.com/users'],
  showAccessToken: true,
  // convertAllRequestsToCorsExceptNavigate: false, // default value is false
  // setAccessTokenToNavigateRequests: true, // default value is true
};

// DPoP (Demonstrating Proof of Possession) will be activated for the following domains
trustedDomains.config_with_dpop = {
  domains: ['https://demo.duendesoftware.com'],
  demonstratingProofOfPossession: true,
  demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: true, // default value is false, inject DPOP token only when DPOP header is present
  // Optional, more details bellow
  /*demonstratingProofOfPossessionConfiguration: {  
   importKeyAlgorithm: {
     name: 'ECDSA',
     namedCurve: 'P-256',
     hash: {name: 'ES256'}
   },
   signAlgorithm: {name: 'ECDSA', hash: {name: 'SHA-256'}},
   generateKeyAlgorithm: {
     name: 'ECDSA',
     namedCurve: 'P-256'
   },
   digestAlgorithm: { name: 'SHA-256' },
   jwtHeaderAlgorithm : 'ES256'
 }*/
};
```

## Run The Demo

```sh
git clone https://github.com/AxaFrance/oidc-client.git
cd oidc-client
pnpm install
cd /examples/react-oidc-demo
pnpm install
pnpm start
# then navigate to http://localhost:4200
```

## Examples

### Application startup

The library is router agnostic and use native History API.

The default routes used internally :

- www.your-app.fr/authentication/callback

```javascript
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { OidcProvider } from '@axa-fr/react-oidc';
import Header from './Layout/Header';
import Routes from './Router';

// This configuration use hybrid mode
// ServiceWorker are used if available (more secure) else tokens are given to the client
// You need to give inside your code the "access_token" when using fetch
const configuration = {
  client_id: 'interactive.public.short',
  redirect_uri: window.location.origin + '/authentication/callback',
  silent_redirect_uri: window.location.origin + '/authentication/silent-callback',
  scope: 'openid profile email api offline_access', // offline_access scope allow your client to retrieve the refresh_token
  authority: 'https://demo.duendesoftware.com',
  service_worker_relative_url: '/OidcServiceWorker.js', // just comment that line to disable service worker mode
  service_worker_only: false,
  demonstrating_proof_of_possession: false,
};

const App = () => (
  <OidcProvider configuration={configuration}>
    <Router>
      <Header />
      <Routes />
    </Router>
  </OidcProvider>
);

render(<App />, document.getElementById('root'));
```

```javascript
const configuration = {
  loadingComponent: ReactComponent, // you can inject your own loading component
  sessionLostComponent: ReactComponent, // you can inject your own session lost component
  authenticating: ReactComponent, // you can inject your own authenticating component
  authenticatingErrorComponent: ReactComponent,
  callbackSuccessComponent: ReactComponent, // you can inject your own call back success component
  serviceWorkerNotSupportedComponent: ReactComponent, // you can inject your page that explains you require a more modern browser
  onSessionLost: Function, // If set, "sessionLostComponent" is not displayed, and onSessionLost callback is called instead
  configuration: {
    client_id: String.isRequired, // oidc client id
    redirect_uri: String.isRequired, // oidc redirect url
    silent_redirect_uri: String, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore sessions
    silent_login_uri: String, // Optional, route that triggers the signin
    silent_login_timeout: Number, // Optional, default is 12000 milliseconds
    scope: String.isRequired, // oidc scope (you need to set "offline_access")
    authority: String.isRequired,
    storage: Storage, // Default sessionStorage, you can set localStorage, but it is less secure against XSS attacks
    authority_configuration: {
      // Optional for providers that do not implement OIDC server auto-discovery via a .wellknown URL
      authorization_endpoint: String,
      token_endpoint: String,
      userinfo_endpoint: String,
      end_session_endpoint: String,
      revocation_endpoint: String,
      check_session_iframe: String,
      issuer: String,
    },
    refresh_time_before_tokens_expiration_in_second: Number, // default is 120 seconds
    service_worker_relative_url: String,
    service_worker_keep_alive_path: String, // default is "/"
    service_worker_only: Boolean, // default false
    service_worker_activate: () => boolean, // you can take the control of the service worker default activation which use user agent string
    service_worker_update_require_callback: (registration:any, stopKeepAlive:Function) => Promise<void>, // callback called when service worker need to be updated, you can take the control of the update process
    service_worker_register: (url: string) => Promise<ServiceWorkerRegistration>, // Optional, you can take the control of the service worker registration
    extras: StringMap | undefined, // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that is sent to the OIDC server (more info: https://github.com/openid/AppAuth-JS)
    token_request_extras: StringMap | undefined, // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that is sent to the OIDC server during token request (more info: https://github.com/openid/AppAuth-JS)
    withCustomHistory: Function, // Override history modification, return an instance with replaceState(url, stateHistory) implemented (like History.replaceState())
    authority_time_cache_wellknowurl_in_second: 60 * 60, // Time to cache in seconds of the openid well-known URL, default is 1 hour
    authority_timeout_wellknowurl_in_millisecond: 10000, // Timeout in milliseconds of the openid well-known URL, default is 10 seconds, then an error is thrown
    monitor_session: Boolean, // Add OpenID monitor session, default is false (more information https://openid.net/specs/openid-connect-session-1_0.html), if you need to set it to true consider https://infi.nl/nieuws/spa-necromancy/
    onLogoutFromAnotherTab: Function, // Optional, can be set to override the default behavior, this function is triggered when a user with the same subject is logged out from another tab when session_monitor is active
    onLogoutFromSameTab: Function, // Optional, can be set to override the default behavior, this function is triggered when a user is logged out from the same tab when session_monitor is active
    token_renew_mode: String, // Optional, update tokens based on the selected token(s) lifetime: "access_token_or_id_token_invalid" (default), "access_token_invalid", "id_token_invalid"
    token_automatic_renew_mode: TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted, // Optional, default is TokenAutomaticRenewMode.AutomaticBeforeTokensExpiration
    // TokenAutomaticRenewMode.AutomaticBeforeTokensExpiration: renew tokens automatically before they expire
    // TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted: renew tokens automatically only when fetch is executed
    // It requires you to use fetch given by hook useOidcFetch(fetch) or HOC withOidcFetch(fetch)(Component)
    logout_tokens_to_invalidate: Array<string>, // Optional tokens to invalidate during logout, default: ['access_token', 'refresh_token']
    location: ILOidcLocation, // Optional, default is window.location, you can inject your own location object respecting the ILOidcLocation interface
    demonstrating_proof_of_possession: Boolean, // Optional, default is false, if true, the the Demonstrating Proof of Possession will be activated //https://www.rfc-editor.org/rfc/rfc9449.html#name-protected-resource-access
    demonstrating_proof_of_possession_configuration: DemonstratingProofOfPossessionConfiguration // Optional, more details bellow
  },
};

demonstrating_proof_of_possession_configuration: DemonstratingProofOfPossessionConfiguration // Optional, more details bellow
};


interface DemonstratingProofOfPossessionConfiguration {
  generateKeyAlgorithm:  RsaHashedKeyGenParams | EcKeyGenParams,
          digestAlgorithm: AlgorithmIdentifier,
          importKeyAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
          signAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
          jwtHeaderAlgorithm: string
};

// default value of demonstrating_proof_of_possession_configuration
const defaultDemonstratingProofOfPossessionConfiguration: DemonstratingProofOfPossessionConfiguration ={
  importKeyAlgorithm: {
    name: 'ECDSA',
    namedCurve: 'P-256',
    hash: {name: 'ES256'}
  },
  signAlgorithm: {name: 'ECDSA', hash: {name: 'SHA-256'}},
  generateKeyAlgorithm: {
    name: 'ECDSA',
    namedCurve: 'P-256'
  },
  digestAlgorithm: { name: 'SHA-256' },
  jwtHeaderAlgorithm : 'ES256'
};


```

## How to consume

"useOidc" returns all props from the Hook :

```javascript
import React from 'react';
import { useOidc } from './oidc';

export const Home = () => {
  const { login, logout, renewTokens, isAuthenticated } = useOidc();

  return (
    <div className='container-fluid mt-3'>
      <div className='card'>
        <div className='card-body'>
          <h5 className='card-title'>Welcome !!!</h5>
          <p className='card-text'>React Demo Application protected by OpenId Connect</p>
          {!isAuthenticated && (
            <button type='button' className='btn btn-primary' onClick={() => login('/profile')}>
              Login
            </button>
          )}
          {isAuthenticated && (
            <button type='button' className='btn btn-primary' onClick={() => logout()}>
              logout
            </button>
          )}
          {isAuthenticated && (
            <button type='button' className='btn btn-primary' onClick={() => renewTokens()}>
              renewTokens
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

The Hook method exposes :

- isAuthenticated : if the user is logged in or not
- logout: logout function (return a promise)
- login: login function 'return a promise'
- renewTokens: renew tokens function 'return a promise'

## How to secure a component

`OidcSecure` component trigger authentication in case user is not authenticated. So, the children of that component can be accessible only once you are connected.

```javascript
import React from 'react';
import { OidcSecure } from '@axa-fr/react-oidc';

const AdminSecure = () => (
  <OidcSecure>
    <h1>My sub component</h1>}
  </OidcSecure>
);

// adding the oidc user in the props
export default AdminSecure;
```

## How to secure a component : HOC method

"withOidcSecure" act the same as "OidcSecure" it also trigger authentication in case user is not authenticated.

```javascript
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { withOidcSecure } from '@axa-fr/react-oidc';
import Home from '../Pages/Home';
import Dashboard from '../Pages/Dashboard';
import Admin from '../Pages/Admin';

const Routes = () => (
  <Switch>
    <Route exact path='/' component={Home} />
    <Route path='/dashboard' component={withOidcSecure(Dashboard)} />
    <Route path='/admin' component={Admin} />
    <Route path='/home' component={Home} />
  </Switch>
);

export default Routes;
```

## How to get "Access Token" : Hook method

```javascript
import { useOidcAccessToken } from '@axa-fr/react-oidc';

const DisplayAccessToken = () => {
  const { accessToken, accessTokenPayload } = useOidcAccessToken();

  if (!accessToken) {
    return <p>you are not authentified</p>;
  }
  return (
    <div className='card text-white bg-info mb-3'>
      <div className='card-body'>
        <h5 className='card-title'>Access Token</h5>
        <p style={{ color: 'red', backgroundColor: 'white' }}>
          Please consider to configure the ServiceWorker in order to protect your application from
          XSRF attacks. ""access_token" and "refresh_token" will never be accessible from your
          client side javascript.
        </p>
        {<p className='card-text'>{JSON.stringify(accessToken)}</p>}
        {accessTokenPayload != null && (
          <p className='card-text'>{JSON.stringify(accessTokenPayload)}</p>
        )}
      </div>
    </div>
  );
};
```

## How to get IDToken : Hook method

```javascript
import { useOidcIdToken } from '@axa-fr/react-oidc';

const DisplayIdToken = () => {
  const { idToken, idTokenPayload } = useOidcIdToken();

  if (!idToken) {
    return <p>you are not authentified</p>;
  }

  return (
    <div className='card text-white bg-info mb-3'>
      <div className='card-body'>
        <h5 className='card-title'>ID Token</h5>
        {<p className='card-text'>{JSON.stringify(idToken)}</p>}
        {idTokenPayload != null && <p className='card-text'>{JSON.stringify(idTokenPayload)}</p>}
      </div>
    </div>
  );
};
```

## How to get User Information : Hook method

```javascript
import { useOidcUser, UserStatus } from '@axa-fr/react-oidc';

const DisplayUserInfo = () => {
  const { oidcUser, oidcUserLoadingState } = useOidcUser();

  switch (oidcUserLoadingState) {
    case UserStatus.Loading:
      return <p>User Information are loading</p>;
    case UserStatus.Unauthenticated:
      return <p>you are not authenticated</p>;
    case UserStatus.LoadingError:
      return <p>Fail to load user information</p>;
    default:
      return (
        <div className='card text-white bg-success mb-3'>
          <div className='card-body'>
            <h5 className='card-title'>User information</h5>
            <p className='card-text'>{JSON.stringify(oidcUser)}</p>
          </div>
        </div>
      );
  }
};
```

## How to get a fetch that inject Access_Token : Hook method

If your are not using the service worker. Fetch function need to send AccessToken.
This Hook give you a wrapped fetch that add the access token for you.

```javascript
import React, { useEffect, useState } from 'react';
import { useOidcFetch, OidcSecure } from '@axa-fr/react-oidc';

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch('https://demo.duendesoftware.com/connect/userinfo');
      if (res.status != 200) {
        return null;
      }
      return res.json();
    };
    let isMounted = true;
    fetchUserInfoAsync().then((userInfo) => {
      if (isMounted) {
        setLoading(false);
        setOidcUser(userInfo);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <>Loading</>;
  }

  return (
    <div className='container mt-3'>
      <div className='card text-white bg-success mb-3'>
        <div className='card-body'>
          <h5 className='card-title'>User information</h5>
          {oidcUser != null && <p className='card-text'>{JSON.stringify(oidcUser)}</p>}
        </div>
      </div>
    </div>
  );
};

export const FetchUserHook = () => {
  const { fetch } = useOidcFetch();
  return (
    <OidcSecure>
      <DisplayUserInfo fetch={fetch} />
    </OidcSecure>
  );
};
```

## How to get a fetch that inject Access_Token : HOC method

If your are not using the service worker. Fetch function need to send AccessToken.
This HOC give you a wrapped fetch that add the access token for you.

```javascript
import React, { useEffect, useState } from 'react';
import { useOidcFetch, OidcSecure } from '@axa-fr/react-oidc';

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch('https://demo.duendesoftware.com/connect/userinfo');
      if (res.status != 200) {
        return null;
      }
      return res.json();
    };
    let isMounted = true;
    fetchUserInfoAsync().then((userInfo) => {
      if (isMounted) {
        setLoading(false);
        setOidcUser(userInfo);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <>Loading</>;
  }

  return (
    <div className='container mt-3'>
      <div className='card text-white bg-success mb-3'>
        <div className='card-body'>
          <h5 className='card-title'>User information</h5>
          {oidcUser != null && <p className='card-text'>{JSON.stringify(oidcUser)}</p>}
        </div>
      </div>
    </div>
  );
};

const UserInfoWithFetchHoc = withOidcFetch(fetch)(DisplayUserInfo);
export const FetchUserHoc = () => (
  <OidcSecure>
    <UserInfoWithFetchHoc />
  </OidcSecure>
);
```

## Components override

You can inject your own components.
All components definition receive props `configurationName`. Please checkout the demo for more complete example.

```javascript
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { OidcProvider } from '@axa-fr/react-oidc';
import Header from './Layout/Header';
import Routes from './Router';

// This configuration use hybrid mode
// ServiceWorker are used if available (more secure) else tokens are given to the client
// You need to give inside your code the "access_token" when using fetch
const configuration = {
  client_id: 'interactive.public.short',
  redirect_uri: 'http://localhost:4200/authentication/callback',
  silent_redirect_uri: 'http://localhost:4200/authentication/silent-callback',
  scope: 'openid profile email api offline_access',
  authority: 'https://demo.identityserver.io',
  service_worker_relative_url: '/OidcServiceWorker.js',
  service_worker_only: false,
};

const Loading = () => <p>Loading</p>;
const AuthenticatingError = () => <p>Authenticating error</p>;
const Authenticating = () => <p>Authenticating</p>;
const SessionLost = () => <p>Session Lost</p>;
const ServiceWorkerNotSupported = () => <p>Not supported</p>;
const CallBackSuccess = () => <p>Success</p>;

//const [isSessionLost, setIsSessionLost] = useState(false);

//const onSessionLost = ()=>{
//  setIsSessionLost(true);
//}

const App = () => (
  <OidcProvider
    configuration={configuration}
    loadingComponent={Loading}
    authenticatingErrorComponent={AuthenticatingError}
    authenticatingComponent={Authenticating}
    sessionLostComponent={SessionLost}
    //onSessionLost={onSessionLost} // If set "sessionLostComponent" is not displayed and onSessionLost callback is called instead
    serviceWorkerNotSupportedComponent={ServiceWorkerNotSupported}
    callbackSuccessComponent={CallBackSuccess}
  >
    {/* isSessionLost && <SessionLost />*/}
    <Router>
      <Header />
      <Routes />
    </Router>
  </OidcProvider>
);

render(<App />, document.getElementById('root'));
```

## How It Works

These components encapsulate the use of "@axa-fr/vanilla-oidc" in order to hide workflow complexity.
Internally, native History API is used to be router library agnostic.

More information about OIDC

- [French : Augmentez la sécurité et la simplicité de votre Système d’Information OpenID Connect](https://medium.com/just-tech-it-now/augmentez-la-s%C3%A9curit%C3%A9-et-la-simplicit%C3%A9-de-votre-syst%C3%A8me-dinformation-avec-oauth-2-0-cf0732d71284)
- [English : Increase the security and simplicity of your information system with openid connect](https://medium.com/just-tech-it-now/increase-the-security-and-simplicity-of-your-information-system-with-openid-connect-fa8c26b99d6d)
- [English: youtube OIDC](https://www.youtube.com/watch?v=frIJfavZkUE&list=PL8EMdIH6Mzxy2kHtsVOEWqNz-OaM_D_fB&index=1)
- [French: youtube OIDC](https://www.youtube.com/watch?v=H-mLMGzQ_y0&list=PL8EMdIH6Mzxy2kHtsVOEWqNz-OaM_D_fB&index=2)

## NextJS

To work with NextJS you need to inject your own history surcharge like the sample below.

**component/layout.js**

```javascript
import { OidcProvider } from '@axa-fr/react-oidc';
import { useRouter } from 'next/router';

const configuration = {
  client_id: 'interactive.public.short',
  redirect_uri: 'http://localhost:3001/#authentication/callback',
  silent_redirect_uri: 'http://localhost:3001/#authentication/silent-callback', // Optional activate silent-login that use cookies between OIDC server and client javascript to restore the session
  scope: 'openid profile email api offline_access',
  authority: 'https://demo.duendesoftware.com',
};

const onEvent = (configurationName, eventName, data) => {
  console.log(`oidc:${configurationName}:${eventName}`, data);
};

export default function Layout({ children }) {
  const router = useRouter();
  const withCustomHistory = () => {
    return {
      replaceState: (url) => {
        router
          .replace({
            pathname: url,
          })
          .then(() => {
            window.dispatchEvent(new Event('popstate'));
          });
      },
    };
  };

  return (
    <>
      <OidcProvider
        configuration={configuration}
        onEvent={onEvent}
        withCustomHistory={withCustomHistory}
      >
        <main>{children}</main>
      </OidcProvider>
    </>
  );
}
```

For more information checkout the [NextJS React OIDC demo](https://github.com/AxaGuilDEv/react-oidc/tree/master/packages/nextjs-demo)

## Hash route

`react-oidc` work also with hash router.

```javascript
export const configurationIdentityServerWithHash = {
  client_id: 'interactive.public.short',
  redirect_uri: window.location.origin + '#authentication-callback',
  silent_redirect_uri: window.location.origin + '#authentication-silent-callback',
  scope: 'openid profile email api offline_access',
  authority: 'https://demo.duendesoftware.com',
  refresh_time_before_tokens_expiration_in_second: 70,
  service_worker_relative_url: '/OidcServiceWorker.js',
  service_worker_only: false,
};
```
