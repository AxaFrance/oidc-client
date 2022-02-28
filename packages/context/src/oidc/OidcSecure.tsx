import React, {useEffect, PropsWithChildren, FC} from 'react';

import Oidc from "./vanilla/oidc";

type OidcSecureProps = {
    callbackPath?:string;
    configurationName?: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({children, callbackPath=null, configurationName="default"}) => {
    const getOidc =  Oidc.get;
    const oidc = getOidc(configurationName);
    useEffect(() => {
        if(!oidc.tokens){
            oidc.loginAsync(callbackPath);
        }
        return () => {
        }
    }, [configurationName])

    if(!oidc.tokens){
      return null;
    }
    return <>{children}</>
}

export const withOidcSecure = (
  WrappedComponent, callbackPath=null
) => (props) => {
  return <OidcSecure callbackPath={callbackPath}><WrappedComponent {...props} /></OidcSecure>;
};