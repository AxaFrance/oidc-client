import React from 'react';
import PropTypes from 'prop-types';
import { AuthenticationContext } from './AuthenticationContextCreator';
import { OidcRoutes } from '../Routes';

const propTypes = {
  notAuthentified: PropTypes.node,
  notAuthorized: PropTypes.node,
  isLoading: PropTypes.bool.isRequired,
  // eslint-disable-next-line
  oidcUser: PropTypes.object, //TODO : récuperer le proptypes depuis OIDC client ?
  error: PropTypes.string.isRequired,
  login: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
};

const defaultProps = {
  notAuthentified: null,
  notAuthorized: null,
};

const AuthenticationProviderComponent = ({
  isLoading,
  oidcUser,
  error,
  login,
  logout,
  notAuthentified,
  notAuthorized,
  children,
}) => (
  <AuthenticationContext.Provider
    value={{
      isLoading,
      oidcUser,
      error,
      login,
      logout,
    }}
  >
    <OidcRoutes notAuthentified={notAuthentified} notAuthorized={notAuthorized}>
      {children}
    </OidcRoutes>
  </AuthenticationContext.Provider>
);

AuthenticationProviderComponent.propTypes = propTypes;
AuthenticationProviderComponent.defaultProps = defaultProps;

export default AuthenticationProviderComponent;
