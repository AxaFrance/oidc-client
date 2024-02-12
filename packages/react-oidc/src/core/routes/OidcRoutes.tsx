import {getPath, ILOidcLocation} from '@axa-fr/oidc-client';
import React, { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';

import CallbackComponent from '../default-component/Callback.component.js';
import SilentCallbackComponent from '../default-component/SilentCallback.component.js';
import SilentLoginComponent from '../default-component/SilentLogin.component.js';
import { CustomHistory } from './withRouter.js';

type OidcRoutesProps = {
  configurationName: string;
  redirect_uri: string;
  silent_redirect_uri?: string;
  silent_login_uri?: string;
  withCustomHistory?: () => CustomHistory;
};

const OidcRoutes: FC<PropsWithChildren<OidcRoutesProps>> = ({
  redirect_uri,
  silent_redirect_uri,
  silent_login_uri,
  children, 
                                                              configurationName,
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
      return <CallbackComponent configurationName={configurationName} withCustomHistory={withCustomHistory} >{children}</CallbackComponent>;
    default:
      return <>{children}</>;
  }
};

export default React.memo(OidcRoutes);
