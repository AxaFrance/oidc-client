import React from 'react';
import { Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import AuthenticationRoutes from './AuthenticationRoutes';

const propTypes = {
  notAuthentified: PropTypes.node,
  notAuthorized: PropTypes.node,
  children: PropTypes.node,
};

const defaultProps = {
  notAuthentified: null,
  notAuthorized: null,
  children: PropTypes.node,
};

const OidcRoutes = ({ notAuthentified, notAuthorized, children }) => (
  <Switch>
    <Route
      path="/authentication"
      component={AuthenticationRoutes(notAuthentified, notAuthorized)}
    />
    <Route render={() => children} />
  </Switch>
);

OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default OidcRoutes;
