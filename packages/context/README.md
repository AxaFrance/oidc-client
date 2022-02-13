<H1> @axa-fr/react-oidc-context</H1>

- [About](#about)
- [Getting Started](#getting-started)
- [Examples](#examples)
# About

Easy set up of OIDC for react and use the new react context api as state management.
It use AppAuthJS behind the scene. 

- Simple : 
  - refresh_token and access_token are auto refreshed in background
  - with the use of the Service Worker, you do not need to inject the access_token in every fetch, juste configure OidcTrustedDomains.js
- No cookies problem : No silent signin mode inside in iframe
- Secure : 
  - with the use of Service Worker, your tokens are not accessible to the client (protect against XSRF attacks)
  - OIDC using client side Code Credential Grant with pkce only
- Multiple Authentification :
  - You can authenticate many times to the same provider with different scope (for exemple you can acquire a new 'payment' scope for a payment)
  - You can authenticate to multiple different providers inside the same SPA (single page application) website
- Flexible :
  - Work with Service Worker (more secure) and whithout for older browser (less secure)


# Getting Started

```sh
npm install @axa-fr/react-oidc-context copyfiles --save
```

If you need a very secure mode where refresh_token and access_token will be hide behind a service worker that will proxify requests.

Add a copy task in order to install and stay up to date an Oidc Service Worker.
The only file you should edit is "OidcTrustedDomains.js" which will never be erased with following configuration bellow.

```sh
#package.json
{
    "scripts": {
        "copy": "copyfiles -f ./node_modules/@axa-fr/react-oidc-context/dist/OidcServiceWorker.js ./public && copyfiles -f -s ./node_modules/@axa-fr/react-oidc-context/dist/OidcTrustedDomains.js ./public",
        "start:server": "npm run copy && react-scripts start",
        "build:server": "npm run copy && react-scripts build",
    }
}
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
import { OidcProvider } from '@axa-fr/react-oidc-context';
import Header from './Layout/Header';
import Routes from './Router';

// This configuration use hybrid mode
// ServiceWorker are used if available (more secure) else tokens are given to the client
// You need to give inside your code the "access_token" when using fetch
const configuration = {
  client_id: 'interactive.public.short',
  redirect_uri: 'http://localhost:4200/authentication/callback',
  scope: 'openid profile email api offline_access',
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
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client id
    redirect_uri: PropTypes.string.isRequired, // oidc redirect url
    scope: PropTypes.string.isRequired, // oidc scope (you need to set "offline_access")
    authority: PropTypes.string.isRequired,
    refresh_time_before_tokens_expiration_in_second: PropTypes.number,
    service_worker_relative_url: PropTypes.string,
  }).isRequired
};
```
## How to consume 

"useReactOidc" returns all props from the Hook :

```javascript
import React from 'react';
import {useOidc} from "./oidc";

export const Home = () => {

    const { login, logout, isLogged} = useOidc();
    
    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Welcome !!!</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect</p>
                    {!isLogged && <button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button>}
                    {isLogged && <button type="button" className="btn btn-primary" onClick={logout}>logout</button>}
                </div>
            </div>
        </div>
    )
};

```
The Hook method exposes : 
- isLogged : is the user logged?
- logout: logout function (return a promise)
- login: login function 'return a promise'

## How to secure a component : Hook method

"OidcSecure" component trigger authentication in case user is not authenticated. So, the children of that component can be accessible only once you are connected.

```javascript
import React from 'react';
import { OidcSecure } from '@axa-fr/react-oidc-context';

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
import { withOidcSecure } from '@axa-fr/react-oidc-context';
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
import { useOidcAccessToken } from '@axa-fr/react-oidc-context';

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
                {accessToken != null && <p className="card-text">{JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">{JSON.stringify(accessTokenPayload)}</p>}
            </div>
        </div>
    )
};
```

## How to get IDToken : Hook method

```javascript
import { useOidcIdToken } from '@axa-fr/react-oidc-context';

const DisplayIdToken =() => {
    const{ idToken, idTokenPayload } = useOidcIdToken();

    if(!idToken){
        return <p>you are not authentified</p>
    }
    
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">ID Token</h5>
                {idToken != null && <p className="card-text">{JSON.stringify(idToken)}</p>}
                {idTokenPayload != null && <p className="card-text">{JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    );
}

```


## How to get User Information : Hook method

```javascript
import { useOidcUser } from '@axa-fr/react-oidc-context';

const DisplayUserInfo = () => {
    const{ oidcUser, isOidcUserLoading, isLogged } = useOidcUser();

    if(isOidcUserLoading) {
        return <p>User Information are loading</p>
    }

    if(!isLogged){
        return <p>you are not authentified</p>
    }

    return (
        <div className="card text-white bg-success mb-3">
            <div className="card-body">
                <h5 className="card-title">User information</h5>
                <p>{oidcUser == null && "You are not logged" }</p>
                {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
            </div>
        </div>
    )
};
```