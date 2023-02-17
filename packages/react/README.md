# @axa-fr/react-oidc

[![Continuous Integration](https://github.com/AxaGuilDEv/react-oidc/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/AxaGuilDEv/react-oidc/actions/workflows/npm-publish.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=alert_status)](https://sonarcloud.io/dashboard?id=AxaGuilDEv_react-oidc) [![Reliability](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=reliability_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=reliability_rating) [![Security](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=security_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=security_rating) [![Code Corevage](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=coverage)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=Coverage) [![Twitter](https://img.shields.io/twitter/follow/GuildDEvOpen?style=social)](https://twitter.com/intent/follow?screen_name=GuildDEvOpen)

Try the demo at https://black-rock-0dc6b0d03.1.azurestaticapps.net/

![Sample React OIDC](https://github.com/AxaGuilDEv/react-oidc/blob/master/docs/img/introduction.gif?raw=true)

A set of react components to make OIDC (OpenID Connect) client easy. It aim to simplify OAuth authentication between multiples providers.

- [About](#about)
- [Getting Started](#getting-started)
- [Run The Demo](#run-the-demo)
- [Examples](#examples)
- [How It Works](#how-it-works)
- [NextJS](#NextJS)
- [Hash route](#Hash-route)
- [Service Worker Support](#service-worker-support)

## About

Easy set up of OIDC for react.
It is a real alternative to existing oidc-client libraries.

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

## Getting Started

```sh
npm install @axa-fr/react-oidc --save

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

## Run The Demo

```sh
git clone https://github.com/AxaGuilDEv/react-oidc.git
cd react-oidc/packages/react
npm install
npm start
# then navigate to http://localhost:4200
```

## Examples

### Application startup

The library is router agnostic and use native History API.

The default routes used internally :

- www.your-app.fr/authentication/callback

```javascript
import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { OidcProvider } from "@axa-fr/react-oidc";
import Header from "./Layout/Header";
import Routes from "./Router";

// This configuration use hybrid mode
// ServiceWorker are used if available (more secure) else tokens are given to the client
// You need to give inside your code the "access_token" when using fetch
const configuration = {
  client_id: "interactive.public.short",
  redirect_uri: window.location.origin + "/authentication/callback",
  silent_redirect_uri:
    window.location.origin + "/authentication/silent-callback",
  scope: "openid profile email api offline_access", // offline_access scope allow your client to retrieve the refresh_token
  authority: "https://demo.duendesoftware.com",
  service_worker_relative_url: "/OidcServiceWorker.js",
  service_worker_only: false,
};

const App = () => (
  <OidcProvider configuration={configuration}>
    <Router>
      <Header />
      <Routes />
    </Router>
  </OidcProvider>
);

render(<App />, document.getElementById("root"));
```

```javascript
const propTypes = {
  loadingComponent: PropTypes.elementType, // you can inject your own loading component
  sessionLostComponent: PropTypes.elementType, // you can inject your own session lost component
  authenticating: PropTypes.elementType, // you can inject your own authenticationg component
  authenticatingErrorComponent: PropTypes.elementType,
  callbackSuccessComponent: PropTypes.elementType, // you can inject your own call back success component
  serviceWorkerNotSupportedComponent: PropTypes.elementType, // you can inject your page that explain your require a more modern browser
  onSessionLost: PropTypes.function, // If set "sessionLostComponent" is not displayed and onSessionLost callback is called instead
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client id
    redirect_uri: PropTypes.string.isRequired, // oidc redirect url
    silent_redirect_uri: PropTypes.string, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore sessions
    silent_login_uri: PropTypes.string, // Optional, route that trigger the signin
    silent_login_timeout: PropTypes.number, // Optional default is 12000 milliseconds
    scope: PropTypes.string.isRequired, // oidc scope (you need to set "offline_access")
    authority: PropTypes.string.isRequired,
    storage: Storage, // Default sessionStorage, you can set localStorage but it is less secure to XSS attacks
    authority_configuration: PropTypes.shape({
      // Optional for providers that does not implement OIDC server auto discovery via a .wellknowurl
      authorization_endpoint: PropTypes.string,
      token_endpoint: PropTypes.string,
      userinfo_endpoint: PropTypes.string,
      end_session_endpoint: PropTypes.string,
      revocation_endpoint: PropTypes.string,
      check_session_iframe: PropTypes.string,
    }),
    refresh_time_before_tokens_expiration_in_second: PropTypes.number,
    service_worker_relative_url: PropTypes.string,
    service_worker_only: PropTypes.boolean, // default false
    service_worker_convert_all_requests_to_cors: PropTypes.boolean, // force all requests that servie worker upgrades to have 'cors' mode. This allows setting authentication token on requests initialted by html parsing(e.g. img tags, download links etc).
    extras: StringMap | undefined, // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that are send to the oidc server (more info: https://github.com/openid/AppAuth-JS)
    token_request_extras: StringMap | undefined, // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that are send to the oidc server during token request (more info: https://github.com/openid/AppAuth-JS)
    withCustomHistory: PropTypes.function, // Override history modification, return instance with replaceState(url, stateHistory) implemented (like History.replaceState())
    authority_time_cache_wellknowurl_in_second: 60 * 60, // Time to cache in second of openid wellknowurl, default is 1 hour
    monitor_session: PropTypes.boolean, // Add OpenId monitor session, default is false (more information https://openid.net/specs/openid-connect-session-1_0.html), if you need to set it to true consider https://infi.nl/nieuws/spa-necromancy/
    onLogoutFromAnotherTab: Function, // Optional, can be set to override the default behavior, this function is triggered when user with the same subject is logged out from another tab when session_monitor is active
    onLogoutFromSameTab: Function, // Optional, can be set to override the default behavior, this function is triggered when user is logged out from same tab when session_monitor is active
    token_renew_mode: PropTypes.string, // Optional, update tokens base on the selected token(s) lifetime: "access_token_or_id_token_invalid" (default), "access_token_invalid" , "id_token_invalid"
  }).isRequired,
};
```

## How to consume

"useOidc" returns all props from the Hook :

```javascript
import React from "react";
import { useOidc } from "./oidc";

export const Home = () => {
  const { login, logout, renewTokens, isAuthenticated } = useOidc();

  return (
    <div className="container-fluid mt-3">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Welcome !!!</h5>
          <p className="card-text">
            React Demo Application protected by OpenId Connect
          </p>
          {!isAuthenticated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => login("/profile")}
            >
              Login
            </button>
          )}
          {isAuthenticated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => logout()}
            >
              logout
            </button>
          )}
          {isAuthenticated && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => renewTokens()}
            >
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
import React from "react";
import { OidcSecure } from "@axa-fr/react-oidc";

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
import React from "react";
import { Switch, Route } from "react-router-dom";
import { withOidcSecure } from "@axa-fr/react-oidc";
import Home from "../Pages/Home";
import Dashboard from "../Pages/Dashboard";
import Admin from "../Pages/Admin";

const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route path="/dashboard" component={withOidcSecure(Dashboard)} />
    <Route path="/admin" component={Admin} />
    <Route path="/home" component={Home} />
  </Switch>
);

export default Routes;
```

## How to get "Access Token" : Hook method

```javascript
import { useOidcAccessToken } from "@axa-fr/react-oidc";

const DisplayAccessToken = () => {
  const { accessToken, accessTokenPayload } = useOidcAccessToken();

  if (!accessToken) {
    return <p>you are not authentified</p>;
  }
  return (
    <div className="card text-white bg-info mb-3">
      <div className="card-body">
        <h5 className="card-title">Access Token</h5>
        <p style={{ color: "red", backgroundColor: "white" }}>
          Please consider to configure the ServiceWorker in order to protect
          your application from XSRF attacks. ""access_token" and
          "refresh_token" will never be accessible from your client side
          javascript.
        </p>
        {<p className="card-text">{JSON.stringify(accessToken)}</p>}
        {accessTokenPayload != null && (
          <p className="card-text">{JSON.stringify(accessTokenPayload)}</p>
        )}
      </div>
    </div>
  );
};
```

## How to get IDToken : Hook method

```javascript
import { useOidcIdToken } from "@axa-fr/react-oidc";

const DisplayIdToken = () => {
  const { idToken, idTokenPayload } = useOidcIdToken();

  if (!idToken) {
    return <p>you are not authentified</p>;
  }

  return (
    <div className="card text-white bg-info mb-3">
      <div className="card-body">
        <h5 className="card-title">ID Token</h5>
        {<p className="card-text">{JSON.stringify(idToken)}</p>}
        {idTokenPayload != null && (
          <p className="card-text">{JSON.stringify(idTokenPayload)}</p>
        )}
      </div>
    </div>
  );
};
```

## How to get User Information : Hook method

```javascript
import { useOidcUser, UserStatus } from "@axa-fr/react-oidc";

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
        <div className="card text-white bg-success mb-3">
          <div className="card-body">
            <h5 className="card-title">User information</h5>
            <p className="card-text">{JSON.stringify(oidcUser)}</p>
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
import React, { useEffect, useState } from "react";
import { useOidcFetch, OidcSecure } from "@axa-fr/react-oidc";

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch(
        "https://demo.duendesoftware.com/connect/userinfo",
      );
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
    <div className="container mt-3">
      <div className="card text-white bg-success mb-3">
        <div className="card-body">
          <h5 className="card-title">User information</h5>
          {oidcUser != null && (
            <p className="card-text">{JSON.stringify(oidcUser)}</p>
          )}
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
import React, { useEffect, useState } from "react";
import { useOidcFetch, OidcSecure } from "@axa-fr/react-oidc";

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch(
        "https://demo.duendesoftware.com/connect/userinfo",
      );
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
    <div className="container mt-3">
      <div className="card text-white bg-success mb-3">
        <div className="card-body">
          <h5 className="card-title">User information</h5>
          {oidcUser != null && (
            <p className="card-text">{JSON.stringify(oidcUser)}</p>
          )}
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
import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { OidcProvider } from "@axa-fr/react-oidc";
import Header from "./Layout/Header";
import Routes from "./Router";

// This configuration use hybrid mode
// ServiceWorker are used if available (more secure) else tokens are given to the client
// You need to give inside your code the "access_token" when using fetch
const configuration = {
  client_id: "interactive.public.short",
  redirect_uri: "http://localhost:4200/authentication/callback",
  silent_redirect_uri: "http://localhost:4200/authentication/silent-callback",
  scope: "openid profile email api offline_access",
  authority: "https://demo.identityserver.io",
  service_worker_relative_url: "/OidcServiceWorker.js",
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

render(<App />, document.getElementById("root"));
```

## How It Works

These components encapsulate the use of "@axa-fr/vanilla-oidc" in order to hide workflow complexity.
Internally, native History API is used to be router library agnostic.

More information about OIDC

- [French : Augmentez la sécurité et la simplicité de votre Système d’Information OpenID Connect](https://medium.com/just-tech-it-now/augmentez-la-s%C3%A9curit%C3%A9-et-la-simplicit%C3%A9-de-votre-syst%C3%A8me-dinformation-avec-oauth-2-0-cf0732d71284)
- [English : Increase the security and simplicity of your information system with openid connect](https://medium.com/just-tech-it-now/increase-the-security-and-simplicity-of-your-information-system-with-openid-connect-fa8c26b99d6d)

## NextJS

To work with NextJS you need to inject your own history surcharge like the sample below.

**component/layout.js**

```javascript
import { OidcProvider } from "@axa-fr/react-oidc";
import { useRouter } from "next/router";

const configuration = {
  client_id: "interactive.public.short",
  redirect_uri: "http://localhost:3001/#authentication/callback",
  silent_redirect_uri: "http://localhost:3001/#authentication/silent-callback", // Optional activate silent-login that use cookies between OIDC server and client javascript to restore the session
  scope: "openid profile email api offline_access",
  authority: "https://demo.duendesoftware.com",
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
            window.dispatchEvent(new Event("popstate"));
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
