# @axa-fr/react-oidc-redux

## About

Easy set up of OIDC for react and use "redux" as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-redux --save
```

### Application startup (index.js)

"BrowserRouter" should be declared before "AuthentificationProvider".
The library need it to manage and normalise http redirection.
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
    triggerAuthFlow: true
  }
};

const isEnabled = configuration.origin === document.location.origin;

const Start = (
  <Provider store={store}>
    <BrowserRouter>
      <Oidc store={store} configuration={configuration.config}  isEnabled={isEnabled}>
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
  notAuthenticated: PropTypes.node, // react component displayed during authentication
  notAuthorized: PropTypes.node, // react component displayed in case user is not Authorised
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client configuration, the same as oidc client library used internally https://github.com/IdentityModel/oidc-client-js
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool.isRequired,
    loadUserInfo: PropTypes.bool.isRequired,
    triggerAuthFlow: PropTypes.bool.isRequired
  }).isRequired,
  isEnabled: PropTypes.bool // enable/disable the protections and trigger of authentication (useful during development).
};
```
 See bellow a sample of configuration, you can have more information about on [oidc client github](https://github.com/IdentityModel/oidc-client-js)

### Initialize Oidc reducer (Store/reducer.js)

```javascript
import { combineReducers } from 'redux';
import { reducer as oidc } from '@axa-fr/react-oidc-redux';

export default combineReducers({
  oidc
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
``` shell
npm install
```
then a
``` Shell
npm start
```
