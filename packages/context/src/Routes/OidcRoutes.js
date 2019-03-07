import React from "react";
import { Route, Switch } from "react-router-dom";
import PropTypes from "prop-types";
import { Callback, SilentCallback } from "../Callback";
import { NotAuthenticated, NotAuthorized } from "../OidcComponents";

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
  children: PropTypes.node
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  children: null
};

const getLocation = href => {
  const match = href.match(
    /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/
  );
  return (
    match && {
      href,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      path: match[5],
      search: match[6],
      hash: match[7]
    }
  );
};

export const getPath = href => {
  const location = getLocation(href);
  console.log(location);
  let { path } = location;
  const { search, hash } = location;

  if (search) {
    path += search;
  }

  if (hash) {
    path += hash;
  }

  return path;
};

const OidcRoutes = ({
  notAuthenticated,
  notAuthorized,
  configuration,
  children
}) => {
  const notAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const notAuthorizedComponent = notAuthorized || NotAuthorized;
  const silentCallbackPath = getPath(configuration.silent_redirect_uri);
  const callbackPath = getPath(configuration.redirect_uri);
  console.log(configuration);
  return (
    <Switch>
      <Route path={callbackPath} component={Callback} />
      <Route path={silentCallbackPath} component={SilentCallback} />
      <Route
        path="/authentication/not-authenticated"
        component={notAuthenticatedComponent}
      />
      <Route
        path="/authentication/not-authorized"
        component={notAuthorizedComponent}
      />
      <Route render={() => children} />
    </Switch>
  );
};

OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default OidcRoutes;
