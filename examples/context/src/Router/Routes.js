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
