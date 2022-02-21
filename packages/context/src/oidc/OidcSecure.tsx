import React, {useEffect, useContext, PropsWithChildren, FC} from 'react';

import {OidcContext} from "./OidcProvider"

type OidcSecureProps = {
    callbackPath:string;
    configurationName: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({children, callbackPath=null, configurationName="default"}) => {
    const {getOidc} = useContext(OidcContext);
    const oidc = getOidc(configurationName);
    useEffect(() => {
        if(!oidc.tokens){
            oidc.loginAsync(callbackPath);
        }
        return () => {
        }
    }, [])

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