import React, { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { UserManagerSettings } from 'oidc-client';
import { NotAuthenticated, NotAuthorized, SessionLost } from '../default-component';
import { getPath, getAuthenticationRoutePath } from './route-utils';
import { SilentCallback } from '../callbacks';

const propTypes = {
  notAuthenticated: PropTypes.elementType,
  notAuthorized: PropTypes.elementType,
  callbackComponent: PropTypes.elementType.isRequired,
  sessionLost: PropTypes.elementType,
  configuration: PropTypes.shape({
    redirect_uri: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
  }).isRequired,
  children: PropTypes.node,
};

const defaultProps: Partial<OidcRoutesProps> = {
  notAuthenticated: null,
  notAuthorized: null,
  sessionLost: null,
};

type OidcRoutesProps = {
  notAuthenticated?: ComponentType;
  notAuthorized?: ComponentType;
  callbackComponent: ComponentType;
  sessionLost?: ComponentType;
  configuration: UserManagerSettings;
};

const OidcRoutes: FC<PropsWithChildren<OidcRoutesProps>> = ({
  notAuthenticated,
  notAuthorized,
  callbackComponent: CallbackComponent,
  sessionLost,
  configuration,
  children,
}) => {
  const [path, setPath] = useState(window.location.pathname);

  const setNewPath = () => setPath(window.location.pathname);
  useEffect(() => {
    setNewPath();
    window.addEventListener('popstate', setNewPath, false);
    return () => window.removeEventListener('popstate', setNewPath, false);
  });

  const NotAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const NotAuthorizedComponent = notAuthorized || NotAuthorized;
  const SessionLostComponent = sessionLost || SessionLost;
  const silentCallbackPath = getPath(configuration.silent_redirect_uri);
  const callbackPath = getPath(configuration.redirect_uri);

  if (path === callbackPath) return <CallbackComponent />;
  if (path === silentCallbackPath) return <SilentCallback />;

  const authenticationRoute = getAuthenticationRoutePath(path);
  if (authenticationRoute) {
    if (authenticationRoute === 'authentication/not-authenticated') return <NotAuthenticatedComponent />;
    if (authenticationRoute === 'authentication/not-authorized') return <NotAuthorizedComponent />;
    if (authenticationRoute === 'authentication/session-lost') return <SessionLostComponent />;
  }

  return <>{children}</>;
};

// @ts-ignore
OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default React.memo(OidcRoutes);
