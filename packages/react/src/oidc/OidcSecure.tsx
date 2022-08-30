import React, {useEffect, PropsWithChildren, FC} from 'react';

import Oidc, {StringMap} from "./vanilla/oidc";

export type OidcSecureProps = {
    callbackPath?:string;
    extras?:StringMap
    configurationName?: string;
    state?: string|undefined;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({children, callbackPath=null, extras=null, configurationName="default"}) => {
    const getOidc =  Oidc.get;
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
  configurationName="default", 
  state: string|undefined=undefined
) => (props) => {
  return <OidcSecure state={state} callbackPath={callbackPath} extras={extras} configurationName={configurationName}><WrappedComponent {...props} /></OidcSecure>;
};