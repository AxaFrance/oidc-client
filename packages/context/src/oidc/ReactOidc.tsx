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

const accessTokenInitialState = {accessToken:null, accessTokenPayload:null};

export const useOidcAccessToken =(configurationName="default") =>{
    const {getOidc} = useContext(OidcContext);
    const [state, setAccessToken] = useState<any>(accessTokenInitialState);
    
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setAccessToken({accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload });
        }
        const subscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setAccessToken(tokens != null  ? {accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload } : accessTokenInitialState);
                }
            }
        });
        return  () => { 
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, []);
    console.log(state)
    return state;
}

const idTokenInitialState = {idToken:null, idTokenPayload:null};

export const useOidcIdToken =(configurationName="default") =>{
    const {getOidc} = useContext(OidcContext);
    const [state, setIDToken] = useState<any>(idTokenInitialState);

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setIDToken({idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload});
        }
        const subscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setIDToken(tokens != null  ? {idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload} : idTokenInitialState);
                }
            }

        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, []);
    return state;
}