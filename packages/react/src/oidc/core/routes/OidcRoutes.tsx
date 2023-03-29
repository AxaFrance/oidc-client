import React, { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';

import { getPath } from '../../vanilla/route-utils.js';
import CallbackComponent from '../default-component/Callback.component.js';
import SilentCallbackComponent from '../default-component/SilentCallback.component.js';
import SilentLoginComponent from '../default-component/SilentLogin.component.js';
import { CustomHistory } from './withRouter.js';

const defaultProps: Partial<OidcRoutesProps> = {

};

type OidcRoutesProps = {
  callbackSuccessComponent?: ComponentType;
  callbackErrorComponent?: ComponentType;
  authenticatingComponent?: ComponentType;
  configurationName:string;
  redirect_uri: string;
  silent_redirect_uri?: string;
  silent_login_uri?:string;
  withCustomHistory?: () => CustomHistory;
};

const OidcRoutes: FC<PropsWithChildren<OidcRoutesProps>> = ({
  callbackErrorComponent,
  callbackSuccessComponent,
                                                              redirect_uri,
                                                              silent_redirect_uri,
                                                              silent_login_uri,
  children, configurationName,
  withCustomHistory = null,
}) => {
  // This exist because in next.js window outside useEffect is null
  const pathname = window ? getPath(window.location.href) : '';

  const [path, setPath] = useState(pathname);

  useEffect(() => {
    const setNewPath = () => setPath(getPath(window.location.href));
    setNewPath();
    window.addEventListener('popstate', setNewPath, false);
    return () => window.removeEventListener('popstate', setNewPath, false);
  }, []);

  const callbackPath = getPath(redirect_uri);

  if (silent_redirect_uri) {
    if (path === getPath(silent_redirect_uri)) {
      return <SilentCallbackComponent configurationName={configurationName} />;
    }
  }

  if (silent_login_uri) {
    if (path === getPath(silent_login_uri)) {
      return <SilentLoginComponent configurationName={configurationName} />;
    }
  }

  switch (path) {
    case callbackPath:
      return <CallbackComponent callBackError={callbackErrorComponent} callBackSuccess={callbackSuccessComponent} configurationName={configurationName} withCustomHistory={withCustomHistory} />;
    default:
      return <>{children}</>;
  }
};

// @ts-ignore
OidcRoutes.defaultProps = defaultProps;

export default React.memo(OidcRoutes);
