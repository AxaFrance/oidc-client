import React, {useEffect, useState} from 'react';
import Oidc from "./vanilla/oidc";

const defaultConfigurationName = "default";
export const useOidc =(configurationName=defaultConfigurationName) =>{
    const getOidc =  Oidc.get;
   
    const login = (callbackPath=undefined) => {
        return getOidc(configurationName).loginAsync(callbackPath);
    };
    const logout = () => {
        return getOidc(configurationName).logoutAsync();
    };
    
    let isLogged = false;
    const oidc = getOidc(configurationName);
    if(oidc){
        isLogged = getOidc(configurationName).tokens != null;
    }
    
    return {login, logout, isLogged };
}

const accessTokenInitialState = {accessToken:null, accessTokenPayload:null};

export const useOidcAccessToken =(configurationName=defaultConfigurationName) =>{
    const getOidc =  Oidc.get;
    const [state, setAccessToken] = useState<any>(accessTokenInitialState);
    const [subscriptionId, setSubscriptionId] = useState(null);
    
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setAccessToken({accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload });
        }
        if(subscriptionId){
            oidc.removeEventSubscription(subscriptionId);
        }
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setAccessToken(tokens != null  ? {accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload } : accessTokenInitialState);
                }
            }
        });
        if(isMounted){
            setSubscriptionId(newSubscriptionId);
        }
        return  () => { 
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, [configurationName]);
    return state;
}

const idTokenInitialState = {idToken:null, idTokenPayload:null};

export const useOidcIdToken =(configurationName= defaultConfigurationName) =>{
    const getOidc =  Oidc.get;
    const [state, setIDToken] = useState<any>(idTokenInitialState);
    const [subscriptionId, setSubscriptionId] = useState(null);
    
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setIDToken({idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload});
        }
        if(subscriptionId){
            oidc.removeEventSubscription(subscriptionId);
        }
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setIDToken(tokens != null  ? {idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload} : idTokenInitialState);
                }
            }
        });
        if(isMounted){
            setSubscriptionId(newSubscriptionId);
        }
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(subscriptionId);
        };
    }, [configurationName]);
    return state;
}