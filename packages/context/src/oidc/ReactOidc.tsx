import React, {useContext, useEffect, useState} from 'react';
import {OidcContext} from "./OidcProvider";
import Oidc from "./vanilla/oidc";

export const useOidc =() =>{
    const {getOidc} = useContext(OidcContext);
    const login = (callbackPath=undefined) => {
        return getOidc().loginAsync(callbackPath);
    };
    const logout = () => {
        return getOidc().logoutAsync();
    };
    return {login, logout, isLogged: getOidc().tokens != null};
}

export const useOidcAccessToken =() =>{
    const {getOidc} = useContext(OidcContext);
    const [accessToken, setAccessToken] = useState<string>(null);
    
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc();
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

export const useOidcIdToken =() =>{
    const {getOidc} = useContext(OidcContext);
    const [idToken, setIDToken] = useState<string>(null);

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc();
        if(getOidc().tokens != null) {
            setIDToken(getOidc().tokens.idToken);
        }
        const subscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    setIDToken(getOidc().tokens != null  ? getOidc().tokens.idToken : null);
                }
            }

        });
        return  () => {
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, []);
    return {idToken};
}