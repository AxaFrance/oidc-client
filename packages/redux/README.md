# @axa-fr/react-oidc-redux

## About

Easy set up of OIDC for react and use "redux" as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-redux --save
```

### Application startup (index.js)

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

const Start = (
  <Provider store={store}>
    <BrowserRouter>
      <Oidc store={store} configuration={configuration}>
        <App />
      </Oidc>
    </BrowserRouter>
  </Provider>
);

ReactDOM.render(Start, document.getElementById('root'));
registerServiceWorker();
```

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
