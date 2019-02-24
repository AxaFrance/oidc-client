import * as React from 'react';
import { Route, Switch } from 'react-router';
import { Callback, SilentCallback } from '../Callback';
import { NotAuthenticated, NotAuthorized } from '../OidcComponents';

const AuthenticationRoutes = (notAuthenticated, notAuthorized) => ({ match }) => {
  const notAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const notAuthorizedComponent = notAuthorized || NotAuthorized;
  return (
    <Switch>
      <Route path={`${match.url}/callback`} component={Callback} />
      <Route path={`${match.url}/silent_callback`} component={SilentCallback} />
      <Route path={`${match.url}/not-authenticated`} component={notAuthenticatedComponent} />
      <Route path={`${match.url}/not-authorized`} component={notAuthorizedComponent} />
    </Switch>
  );
};

export default AuthenticationRoutes;
