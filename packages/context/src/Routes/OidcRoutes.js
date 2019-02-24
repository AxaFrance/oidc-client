import React from 'react';
import { Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import AuthenticationRoutes from './AuthenticationRoutes';

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
  children: PropTypes.node,
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  children: null,
};

const OidcRoutes = ({ notAuthenticated, notAuthorized, children }) => (
  <Switch>
    <Route
      path="/authentication"
      component={AuthenticationRoutes(notAuthenticated, notAuthorized)}
    />
    <Route render={() => children} />
  </Switch>
);

OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default OidcRoutes;
