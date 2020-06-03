import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { withOidcSecure, OidcSecure } from '@axa-fr/react-oidc-context';
import Home from '../Pages/Home';
import Dashboard from '../Pages/Dashboard';
import Admin from '../Pages/Admin';
import SimpleComponent from '../Pages/SimpleComponent';

const PageNotFound = () => <div>Page not found</div>;
const ProtectedSimpleComponent = withOidcSecure(SimpleComponent);
const ProtectedDashboard = withOidcSecure(Dashboard);

const Routes = () => (
  <Switch>
    <Route exact path="/">
      Home
    </Route>
    <Route path="/dashboard">
      <ProtectedDashboard />
    </Route>
    <Route path="/admin">
      <OidcSecure>
        <Admin />
      </OidcSecure>
    </Route>
    <Route path="/home" component={Home} />
    <Route path="/protected1">
      <OidcSecure>
        <SimpleComponent type="Component" />
      </OidcSecure>
    </Route>
    <Route path="/protected2">
      <ProtectedSimpleComponent type="HOC" />
    </Route>
    <Route component={PageNotFound} />
  </Switch>
);

export default Routes;
