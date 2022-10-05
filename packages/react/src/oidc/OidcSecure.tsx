import React, {useEffect, PropsWithChildren, FC} from 'react';

import {StringMap} from "./vanilla/oidc";
import {VanillaOidc} from "./vanilla/vanillaOidc";

export type OidcSecureProps = {
    callbackPath?:string;
    extras?:StringMap
    configurationName?: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({children, callbackPath=null, extras=null, configurationName="default"}) => {
    const getOidc =  VanillaOidc.get;
    const oidc = getOidc(configurationName);
    useEffect(() => {
        if(!oidc.tokens){
            oidc.loginAsync(callbackPath, extras);
        }
        return () => {
        }
    }, [configurationName, callbackPath, extras])

    if(!oidc.tokens){
      return null;
    }
    return <>{children}</>
}

export const withOidcSecure = (
  WrappedComponent: FC<PropsWithChildren<OidcSecureProps>>, 
  callbackPath=null,
  extras=null, 
  configurationName="default"
) => (props) => {
  return <OidcSecure callbackPath={callbackPath} extras={extras} configurationName={configurationName}><WrappedComponent {...props} /></OidcSecure>;
};