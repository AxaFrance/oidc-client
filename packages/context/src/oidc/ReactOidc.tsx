import React, {useContext, useEffect, useState} from 'react';
import {OidcContext} from "./OidcProvider";
import Oidc from "./vanilla/oidc";

export const useOidc =(configurationName="default") =>{
    const {getOidc} = useContext(OidcContext);
    const login = (callbackPath=undefined) => {
        return getOidc(configurationName).loginAsync(callbackPath);
    };
    const logout = () => {
        return getOidc(configurationName).logoutAsync();
    };
    return {login, logout, isLogged: getOidc(configurationName).tokens != null};
}

export const useOidcAccessToken =(configurationName="default") =>{
    const {getOidc} = useContext(OidcContext);
    const [accessToken, setAccessToken] = useState<string>(null);
    
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(getOidc().tokens != null) {
            setAccessToken(getOidc().tokens.accessToken);
        }
        const subscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    setAccessToken(getOidc().tokens != null  ? getOidc().tokens.accessToken : null);
                }
            }
        });
        return  () => { 
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, []);
    return {accessToken};
}

export const useOidcIdToken =(configurationName="default") =>{
    const {getOidc} = useContext(OidcContext);
    const [idToken, setIDToken] = useState<string>(null);

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens != null) {
            setIDToken(oidc.tokens.idToken);
        }
        const subscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setIDToken(tokens != null  ? tokens.idToken : null);
                }
            }

        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, []);
    return {idToken};
}