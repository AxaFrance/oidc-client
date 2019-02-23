import * as React from "react";
import { Route, Switch } from "react-router";
import { Callback, SilentCallback } from "../Callback";
import { NotAuthenticated, NotAuthorized, Authenticating } from "../OidcComponents";
console.log('hello there')
const AuthenticationRoutes = (
  notAuthenticatedComponent = NotAuthenticated,
  notAuthorizedComponent = NotAuthorized,
  authenticatingComponent = Authenticating
) => ({ match }) => {
  return (
    <Switch>
      <Route path={`${match.url}/callback`} component={Callback} />
      <Route path={`${match.url}/silent_callback`} component={SilentCallback} />
      <Route
        path={`${match.url}/not-authentified`}
        component={notAuthenticatedComponent}
      />
      <Route
        path={`${match.url}/not-authorized`}
        component={notAuthorizedComponent}
      />
    </Switch>
  );
};

export default AuthenticationRoutes;
