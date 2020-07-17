import React, { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { UserManagerSettings } from 'oidc-client';
import { NotAuthenticated, NotAuthorized, SessionLost } from '../default-component';
import { getPath } from './route-utils';
import { SilentCallback } from '../callbacks';

const propTypes = {
  notAuthenticated: PropTypes.elementType,
  notAuthorized: PropTypes.elementType,
  callbackComponent: PropTypes.elementType.isRequired,
  configuration: PropTypes.shape({
    redirect_uri: PropTypes.string,
    popup_redirect_uri: PropTypes.string,
    popupWindowFeatures: PropTypes.string,
    silent_redirect_uri: PropTypes.string.isRequired,
  }).isRequired,
  children: PropTypes.node,
};

const defaultProps: Partial<OidcRoutesProps> = {
  notAuthenticated: null,
  notAuthorized: null,
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
  var callbackPath = null;
  if(configuration.redirect_uri !== undefined && configuration.redirect_uri !== null){
    callbackPath = getPath(configuration.redirect_uri);
  }else if(configuration.popup_redirect_uri !== undefined && configuration.popup_redirect_uri !== null){
    callbackPath = getPath(configuration.popup_redirect_uri);
  }else{
    throw TypeError("redirect_uri or popup_redirect_uri have to be set in the configuration!")
  }
   

  switch (path) {
    case callbackPath:
      return <CallbackComponent />;
    case silentCallbackPath:
      return <SilentCallback />;
    case '/authentication/not-authenticated':
      return <NotAuthenticatedComponent />;
    case '/authentication/not-authorized':
      return <NotAuthorizedComponent />;
    case '/authentication/session-lost':
      return <SessionLostComponent />;
    default:
      return <>{children}</>;
  }
};

// @ts-ignore
OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default React.memo(OidcRoutes);
