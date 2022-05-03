<H1> @axa-fr/react-oidc</H1>

Try the demo at https://black-rock-0dc6b0d03.1.azurestaticapps.net/

<p align="center">
    <img src="https://github.com/AxaGuilDEv/react-oidc/blob/master/docs/img/introduction.gif?raw=true"
     alt="Sample React Oicd"
      />
</p>

<p align="center">
  A set of react components to make Oidc (OpenID Connect) client easy. It aim to simplify OAuth authentication between multiples providers.
</p>

- [About](#about)
- [Getting Started](#getting-started)
- [Run The Demo](#run-the-demo)
- [Examples](#examples)
- [How It Works](#how-it-works)
- [Service Worker Support](#service-worker-support)

Easy set up of OIDC for react.
It use AppAuthJS behind the scene because it very lightweight and created by openid certification team. oidc-client use in V3 is heavy and not longer maintained.

- **Secure** :
  - With the use of Service Worker, your tokens (refresh_token and access_token) are not accessible to the javascript client code (big protection against XSRF attacks)
  - OIDC using client side Code Credential Grant with pkce only
- **Lightweight**
- **Simple** :
  - refresh_token and access_token are auto refreshed in background
  - with the use of the Service Worker, you do not need to inject the access_token in every fetch, you have only to configure OidcTrustedDomains.js file
- **No cookies problem** : You can disable silent signin (that internally use an iframe)
- **Multiple Authentication** :
  - You can authenticate many times to the same provider with different scope (for example you can acquire a new 'payment' scope for a payment)
  - You can authenticate to multiple different providers inside the same SPA (single page application) website
- **Flexible** :
  - Work with Service Worker (more secure) and without for older browser (less secure)

<p align="center">
    <img src="https://github.com/AxaGuilDEv/react-oidc/blob/master/docs/img/schema_pcke_client_side_with_service_worker.png?raw=true"
     alt="Schema Authorization Code Grant with pcke flow on the using service worker"
      />
  <br>
  The service worker catch <b>access_token</b> and <b>refresh_token</b> that will never be accessible to the client.
</p>

# Getting Started

```sh
npm install @axa-fr/react-oidc copyfiles --save
```

If you need a very secure mode where refresh_token and access_token will be hide behind a service worker that will proxify requests.

Add a copy task in order to install and stay up to date an Oidc Service Worker.
The only file you should edit is "OidcTrustedDomains.js" which will never be erased with following configuration bellow.

```sh
#package.json
{
    "scripts": {
        "copy": "copyfiles -f ./node_modules/@axa-fr/react-oidc/dist/OidcServiceWorker.js ./public && copyfiles -f -s ./node_modules/@axa-fr/react-oidc/dist/OidcTrustedDomains.js ./public",
        "start:server": "react-scripts start",
        "build:server": "npm run copy && react-scripts build",
        "prepare": "npm run copy"
    }
}
```

```javascript
// OidcTrustedDomains.js
// Add here trusted domains, access tokens will be send to
const trustedDomains = {
    default:["http://localhost:4200"]
};
```

# Run The Demo

```sh
git clone https://github.com/AxaGuilDEv/react-oidc.git
cd react-oidc/packages/react
npm install
npm start
# then navigate to http://localhost:4200
```

# Examples

## Application startup

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
  redirect_uri: 'http://localhost:4200/authentication/callback',
  silent_redirect_uri: 'http://localhost:4200/authentication/silent-callback',
  scope: 'openid profile email api offline_access', // offline_access scope allow your client to retrieve the refresh_token
  authority: 'https://demo.identityserver.io',
  service_worker_relative_url:'/OidcServiceWorker.js',
  service_worker_only:false,
};

const App = () => (
    <OidcProvider configuration={configuration} >
      <Router>
        <Header />
        <Routes />
      </Router>
    </OidcProvider>
);

render(<App />, document.getElementById('root'));
```


```javascript
const propTypes = {
  loadingComponent: PropTypes.elementType, // you can inject your own loading component
  sessionLostComponent: PropTypes.elementType, // you can inject your own session lost component
  authenticating: PropTypes.elementType, // you can inject your own authenticationg component
  callbackSuccessComponent: PropTypes.elementType, // you can inject your own call back success component
  callbackErrorComponent: PropTypes.elementType, // you can inject your own call back error component
  serviceWorkerNotSupportedComponent: PropTypes.elementType, // you can inject your page that explain your require a more modern browser
  onSessionLost: PropTypes.function, // If set "sessionLostComponent" is not displayed and onSessionLost callback is called instead
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client id
    redirect_uri: PropTypes.string.isRequired, // oidc redirect url
    silent_redirect_uri: PropTypes.string, // Optional activate silent-signin that use cookies between OIDC server and client javascript to restore sessions
    silent_signin_timeout: PropTypes.number, // Optional default is 12000 milliseconds
    scope: PropTypes.string.isRequired, // oidc scope (you need to set "offline_access")
    authority: PropTypes.string.isRequired,
    authority_configuration: PropTypes.shape({ // Optional for providers that does not implement OIDC server auto discovery via a .wellknowurl
      authorization_endpoint: PropTypes.string,
      token_endpoint: PropTypes.string,
      userinfo_endpoint: PropTypes.string,
      end_session_endpoint: PropTypes.string,
      revocation_endpoint: PropTypes.string,
    }),
    refresh_time_before_tokens_expiration_in_second: PropTypes.number,
    service_worker_relative_url: PropTypes.string,
    service_worker_only: PropTypes.boolean, // default false
    extras: StringMap|undefined // ex: {'prompt': 'consent', 'access_type': 'offline'} list of key/value that are send to the oidc server (more info: https://github.com/openid/AppAuth-JS)
  }).isRequired
};
```
## How to consume

"useOidc" returns all props from the Hook :

```javascript
import React from 'react';
import {useOidc} from "./oidc";

export const Home = () => {

    const { login, logout, isAuthenticated} = useOidc();
    
    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Welcome !!!</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect</p>
                    {!isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button>}
                    {isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button>}
                </div>
            </div>
        </div>
    )
};

```
The Hook method exposes :
- isAuthenticated : if the user is logged in or not
- logout: logout function (return a promise)
- login: login function 'return a promise'

## How to secure a component

"OidcSecure" component trigger authentication in case user is not authenticated. So, the children of that component can be accessible only once you are connected.

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
import { useOidcAccessToken } from '@axa-fr/react-oidc';

const DisplayAccessToken = () => {
    const{ accessToken, accessTokenPayload } = useOidcAccessToken();

    if(!accessToken){
        return <p>you are not authentified</p>
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{color:'red', "backgroundColor": 'white'}}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. ""access_token" and "refresh_token" will never be accessible from your client side javascript.</p>
                {<p className="card-text">{JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">{JSON.stringify(accessTokenPayload)}</p>}
            </div>
        </div>
    )
};
```

## How to get IDToken : Hook method

```javascript
import { useOidcIdToken } from '@axa-fr/react-oidc';

const DisplayIdToken =() => {
    const{ idToken, idTokenPayload } = useOidcIdToken();

    if(!idToken){
        return <p>you are not authentified</p>
    }
    
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">ID Token</h5>
                {<p className="card-text">{JSON.stringify(idToken)}</p>}
                {idTokenPayload != null && <p className="card-text">{JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    );
}

```


## How to get User Information : Hook method

```javascript
import { useOidcUser, UserStatus } from '@axa-fr/react-oidc';

const DisplayUserInfo = () => {
  const{ oidcUser, oidcUserLoadingState } = useOidcUser();

  switch (oidcUserLoadingState){
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
import React, {useEffect, useState} from 'react';
import { useOidcFetch, OidcSecure } from '@axa-fr/react-oidc';

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch("https://demo.duendesoftware.com/connect/userinfo");
      if (res.status != 200) {
        return null;
      }
      return res.json();
    };
    let isMounted = true;
    fetchUserInfoAsync().then((userInfo) => {
      if(isMounted) {
        setLoading(false);
        setOidcUser(userInfo)
      }
    })
    return  () => {
      isMounted = false;
    };
  },[]);

  if(isLoading){
    return <>Loading</>;
  }

  return (
          <div className="container mt-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-body">
                <h5 className="card-title">User information</h5>
                {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
              </div>
            </div>
          </div>
  )
};

export const FetchUserHook= () => {
  const {fetch} = useOidcFetch();
  return <OidcSecure><DisplayUserInfo fetch={fetch} /></OidcSecure>
}

```

## How to get a fetch that inject Access_Token : HOC method

If your are not using the service worker. Fetch function need to send AccessToken.
This HOC give you a wrapped fetch that add the access token for you.

```javascript
import React, {useEffect, useState} from 'react';
import { useOidcFetch, OidcSecure } from '@axa-fr/react-oidc';

const DisplayUserInfo = ({ fetch }) => {
  const [oidcUser, setOidcUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfoAsync = async () => {
      const res = await fetch("https://demo.duendesoftware.com/connect/userinfo");
      if (res.status != 200) {
        return null;
      }
      return res.json();
    };
    let isMounted = true;
    fetchUserInfoAsync().then((userInfo) => {
      if(isMounted) {
        setLoading(false);
        setOidcUser(userInfo)
      }
    })
    return  () => {
      isMounted = false;
    };
  },[]);

  if(isLoading){
    return <>Loading</>;
  }

  return (
          <div className="container mt-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-body">
                <h5 className="card-title">User information</h5>
                {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
              </div>
            </div>
          </div>
  )
};

const UserInfoWithFetchHoc = withOidcFetch(fetch)(DisplayUserInfo);
export const FetchUserHoc= () => <OidcSecure><UserInfoWithFetchHoc/></OidcSecure>;

```


## Components override

You can inject your own components.
All components definition receive props "configurationName". Please checkout and the the demo for more complexe exemple.

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
  service_worker_relative_url:'/OidcServiceWorker.js',
  service_worker_only:false,
};

const Loading = () => <p>Loading</p>
const AuthenticatingError = () => <p>Authenticating error</p>
const Authenticating = () => <p>Authenticating</p>
const SessionLost = () => <p>Session Lost</p>
const ServiceWorkerNotSupported = () => <p>Not supported</p>
const CallBackSuccess = () => <p>Success</p>

//const [isSessionLost, setIsSessionLost] = useState(false);

//const onSessionLost = ()=>{
//  setIsSessionLost(true);
//}

const App = () => (
        <OidcProvider configuration={configuration}
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

# How It Works

These components encapsulate the use of "AppAuth-JS" in order to hide workfow complexity.
Internally, native History API is used to be router library agnostic.
It use AppAuthJS behind the scene because it very lightweight and created by openid certification team. oidc-client used in V3 is heavy and not longer maintained.

More information about OIDC
- French: https://medium.com/just-tech-it-now/augmentez-la-s%C3%A9curit%C3%A9-et-la-simplicit%C3%A9-de-votre-syst%C3%A8me-dinformation-avec-oauth-2-0-cf0732d71284
- English: https://medium.com/just-tech-it-now/increase-the-security-and-simplicity-of-your-information-system-with-openid-connect-fa8c26b99d6d

# Service Worker Support

- Firefox : tested on firefox 98.0.2
- Chrome/Edge : tested on version upper to 90
- Opera : tested on version upper to 80
- Safari : tested on Safari/605.1.15