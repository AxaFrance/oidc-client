import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { configureStore } from './Store';
import { BrowserRouter } from 'react-router-dom';
import registerServiceWorker from './registerServiceWorker';
import configuration from './configuration';

import { Oidc } from '@axa-fr/react-oidc-redux';

const store = configureStore();
const origin = document.location.origin;

const isEnabled = configuration.isEnabled;
if (!configuration.configurations.lenght <= 0) {
    throw new Error(`No configuration found`);
}
const authenticationConfig = origin ? configuration.configurations.find(m => m.origin === origin) : configuration.configurations[0];
if (!authenticationConfig) {
    throw new Error(`Configuration not found for origin ${origin}`);
}

const Start = (<Provider store={store}>
    <BrowserRouter>
        <Oidc store={store} configuration={authenticationConfig.config} isEnabled={isEnabled} >
            <App />
        </Oidc>
    </BrowserRouter>
</Provider>);

ReactDOM.render(Start, document.getElementById('root'));
registerServiceWorker();
