import React, {useEffect, useContext} from 'react';

import {OidcContext} from "./OidcProvider"

export const OidcSecure = ({children, callbackPath=null}) => {
    const {getOidc} = useContext(OidcContext);
    const oidc = getOidc();
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