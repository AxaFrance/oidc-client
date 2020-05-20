import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { withOidcSecure , OidcSecure} from '@axa-fr/react-oidc-context';
import Home from '../Pages/Home';
import Dashboard from '../Pages/Dashboard';
import Admin from '../Pages/Admin';

const PageNotFound = () => <div>Page not found</div>;

const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route path="/dashboard" component={withOidcSecure(Dashboard)} />
    <Route path="/admin">
      <OidcSecure>
        <Admin />
      </OidcSecure>
    </Route>
    <Route path="/home" component={Home} />
    <Route component={PageNotFound} />
  </Switch>
);

export default Routes;
