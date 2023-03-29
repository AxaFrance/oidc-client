import { FC, PropsWithChildren, useEffect } from 'react';

import { StringMap } from './vanilla/types.js';
import { VanillaOidc } from './vanilla/vanillaOidc.js';

export type OidcSecureProps = {
    callbackPath?:string;
    extras?:StringMap;
    configurationName?: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({ children, callbackPath = null, extras = null, configurationName = 'default' }) => {
    const getOidc = VanillaOidc.get;
    const oidc = getOidc(configurationName);
    useEffect(() => {
        if (!oidc.tokens) {
            oidc.loginAsync(callbackPath, extras);
        }
    }, [configurationName, callbackPath, extras]);

    if (!oidc.tokens) {
      return null;
    }
    return <>{children}</>;
};

export const withOidcSecure = (
  WrappedComponent: FC<PropsWithChildren<OidcSecureProps>>,
  callbackPath = null,
  extras = null,
  configurationName = 'default',
) => (props) => {
  return <OidcSecure callbackPath={callbackPath} extras={extras} configurationName={configurationName}><WrappedComponent {...props} /></OidcSecure>;
};
