# @axa-fr/react-oidc-redux

## About

Easy set up of OIDC for react and use "redux" as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-redux --save
```

### Application startup (index.js)

The library is router agnostic and use native History API.

The default routes used internally :

- www.your-app.fr/authentication/callback
- www.your-app.fr/authentication/silent_callback
- www.your-app.fr/authentication/not-authenticated
- www.your-app.fr/authentication/not-authorized

```javascript
import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { configureStore } from './Store';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import registerServiceWorker from './registerServiceWorker';

import { Oidc } from '@axa-fr/react-oidc-redux';

const store = configureStore();

const configuration = {
  origin: 'http://localhost:3000',
  config: {
    client_id: 'CSk26fuOE2NjQr17oCI1bKzBch9eUzF0',
    redirect_uri: 'http://localhost:3000/authentication/callback',
    response_type: 'id_token token',
    scope: 'openid profile email',
    authority: 'https://samplesreact.eu.auth0.com',
    silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
    automaticSilentRenew: true,
    loadUserInfo: true,
    triggerAuthFlow: true,
  },
};

const isEnabled = configuration.origin === document.location.origin;

const Start = (
  <Provider store={store}>
    <BrowserRouter>
      <Oidc store={store} configuration={configuration.config} isEnabled={isEnabled}>
        <App />
      </Oidc>
    </BrowserRouter>
  </Provider>
);

ReactDOM.render(Start, document.getElementById('root'));
registerServiceWorker();
```

The optional parameter "isEnabled" allows you to enable or disable authentication. You will also find it in the `OidcSecure` component.

"Authentificationprovider" accept the following properties :

```javascript
const propTypes = {
  notAuthenticated: PropTypes.elementType, // react component displayed during authentication
  notAuthorized: PropTypes.elementType, // react component displayed in case user is not Authorised
  callbackComponentOverride: PropTypes.elementType, // react component displayed when user is connected
  sessionLostComponent: PropTypes.elementType, // react component displayed when user loose authentication session
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client configuration, the same as oidc client library used internally https://github.com/IdentityModel/oidc-client-js
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool.isRequired,
    loadUserInfo: PropTypes.bool.isRequired,
    triggerAuthFlow: PropTypes.bool.isRequired,
    metadata : PropTypes.shape({
              issuer: PropTypes.string,
              jwks_uri: PropTypes.string,
              authorization_endpoint: PropTypes.string,
              token_endpoint: PropTypes.string,
              userinfo_endpoint: PropTypes.string,
              end_session_endpoint: PropTypes.string,
              revocation_endpoint: PropTypes.string,
              introspection_endpoint: PropTypes.string
            }),
  }).isRequired,
  isEnabled: PropTypes.bool, // enable/disable the protections and trigger of authentication (useful during development).
};
```

See bellow a sample of configuration, you can have more information about on [oidc client github](https://github.com/IdentityModel/oidc-client-js)

### Polyfill

oidc-client needs some polyfills to works on Internet Explorer. You can use [core-js](https://github.com/zloirock/core-js) to help you. See [Context Sample](../../examples/context). In the sample we use some polyfills

```javascript
import 'core-js/es/array/from';
import 'core-js/es/array/find'; 
import 'core-js/es/array/includes'; 
import 'core-js/es/array/find-index'; 
import 'core-js/es/array/map';

import 'core-js/es/object/assign';

import 'core-js/es/promise';
import 'core-js/es/map';

import 'core-js/es/string/repeat';
import 'core-js/es/string/pad-start';
import 'core-js/es/string/pad-end';
import 'core-js/es/string/starts-with';

import 'whatwg-fetch';
```

### Initialize Oidc reducer (Store/reducer.js)

```javascript
import { combineReducers } from 'redux';
import { reducer as oidc } from '@axa-fr/react-oidc-redux';

export default combineReducers({
  oidc,
});
```

### How to secure a component (App.js)

```javascript
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { Route, Switch } from 'react-router-dom';
import { OidcSecure, oidcSecure } from '@axa-fr/react-oidc-redux';
import User from './User';

const ProtectedChild = () => (
  <OidcSecure>
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="App-title">Protected</h1>
      </header>
      <User />
    </div>
  </OidcSecure>
);

const NotProtectedChild = () => (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <h1 className="App-title">Not Default Protected</h1>
    </header>
    <User />
  </div>
);

class App extends Component {
  render() {
    return (
      <Switch>
        <Route path="/not-protected" component={NotProtectedChild} />
        <Route path="/protected" component={oidcSecure(NotProtectedChild)} />
        <Route component={ProtectedChild} />
      </Switch>
    );
  }
}

export default App;
```

### Example

You can also test a demo application by uploading it to [this link](https://download-directory.github.io/?url=https://github.com/AxaGuilDEv/react-oidc/tree/master/examples/redux) or cloning [the repository](https://github.com/AxaGuilDEv/react-oidc.git) (examples / redux directory).
Then you just need to run a

```shell
npm install
```

then a

```Shell
npm start
```

## Example

- [`create react app & redux`](../../examples/redux)
