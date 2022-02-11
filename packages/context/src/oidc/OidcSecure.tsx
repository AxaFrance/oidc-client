import React, {useEffect, useContext} from 'react';

import {OidcContext} from "./OidcProvider"

export const OidcSecure = ({children, callbackPath=null, configurationName="default"}) => {
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