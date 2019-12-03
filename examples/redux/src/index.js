import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { configureStore } from './Store';
import { BrowserRouter as Router } from 'react-router-dom';
import registerServiceWorker from './registerServiceWorker';
import configuration from './configuration';
import ComponentOverride from './ComponentOverride';

import { Oidc, InMemoryWebStorage } from '@axa-fr/react-oidc-redux';

const store = configureStore();
const origin = document.location.origin;

const isEnabled = configuration.isEnabled;
if (configuration.configurations.length <= 0) {
  throw new Error(`No configuration found`);
}
const authenticationConfig = origin
  ? configuration.configurations.find(m => m.origin === origin)
  : configuration.configurations[0];
if (!authenticationConfig) {
  throw new Error(`Configuration not found for origin ${origin}`);
}

const Start = (
  <Provider store={store}>
    <Router>
      <Oidc
        store={store}
        configuration={authenticationConfig.config}
        isEnabled={isEnabled}
        callbackComponentOverride={ComponentOverride}
        UserStore={InMemoryWebStorage}
      >
        <App />
      </Oidc>
    </Router>
  </Provider>
);

ReactDOM.render(Start, document.getElementById('root'));
registerServiceWorker();
