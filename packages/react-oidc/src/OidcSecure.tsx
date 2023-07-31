import { StringMap, OidcClient } from '@axa-fr/oidc-client';
import { FC, PropsWithChildren, useEffect } from 'react';

export type OidcSecureProps = {
    callbackPath?:string;
    extras?:StringMap;
    configurationName?: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({ children, callbackPath = null, extras = null, configurationName = 'default' }) => {
    const getOidc = OidcClient.get;
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
