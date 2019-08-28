import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { NotAuthenticated, NotAuthorized } from '@axa-fr/react-oidc-core';
import AuthenticationCallback from './AuthenticationCallback';
import AuthenticationSignSilentCallback from './AuthenticationSignSilentCallback';

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
  children: PropTypes.node,
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  children: PropTypes.node,
};

const OidcRoutes = ({ notAuthenticated, notAuthorized, children }) => {
  const [path, setPath] = useState(window.location.pathname);

  const setNewPath = () => setPath(window.location.pathname);

  useEffect(() => {
    setNewPath();
    window.addEventListener('popstate', setNewPath, false);
    return () => window.removeEventListener('popstate', setNewPath, false);
  });

  const NotAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const NotAuthorizedComponent = notAuthorized || NotAuthorized;

  switch (path) {
    case '/authentication/callback':
      return <AuthenticationCallback />;
    case '/authentication/signin-silent-callback':
      return <AuthenticationSignSilentCallback />;
    case '/authentication/not-authenticated':
      return <NotAuthenticatedComponent />;
    case '/authentication/not-authorized':
      return <NotAuthorizedComponent />;
    default:
      return <>{children}</>;
  }
};

OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default OidcRoutes;
