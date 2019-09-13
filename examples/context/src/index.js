import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthenticationProvider, oidcLog } from '@axa-fr/react-oidc-context';
import CustomCallback from './Pages/CustomCallback';
import Header from './Layout/Header';
import Routes from './Router';
import oidcConfiguration from './configuration';

const App = () => (
  <div>
    <AuthenticationProvider
      configuration={oidcConfiguration}
      loggerLevel={oidcLog.DEBUG}
      isEnabled={true}
      callbackComponentOverride={CustomCallback}
    >
      <Router>
        <Header />
        <Routes />
      </Router>
    </AuthenticationProvider>
  </div>
);

render(<App />, document.getElementById('root'));
