import * as React from 'react';
import { Route, Switch } from 'react-router';
import AuthenticationCallback from './AuthenticationCallback';
import AuthenticationSignSilentCallback from './AuthenticationSignSilentCallback';
import NotAuthenticated from './NotAuthenticated';
import NotAuthorized from './NotAuthorized';

const AuthenticationRoutes = (notAuthenticated, notAuthorized) => ({ match }) => {
  const notAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const notAuthorizedComponent = notAuthorized || NotAuthorized;
  return (
    <Switch>
      <Route path={`${match.url}/callback`} component={AuthenticationCallback} />
      <Route
        path={`${match.url}/signin-silent-callback`}
        component={AuthenticationSignSilentCallback}
      />
      <Route path={`${match.url}/not-authenticated`} component={notAuthenticatedComponent} />
      <Route path={`${match.url}/not-authorized`} component={notAuthorizedComponent} />
    </Switch>
  );
};

export default AuthenticationRoutes;
