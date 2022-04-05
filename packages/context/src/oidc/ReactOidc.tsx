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

    let isAuthenticated = false;
    const oidc = getOidc(configurationName);
    if(oidc){
        isAuthenticated = getOidc(configurationName).tokens != null;
    }

    return { login, logout, isAuthenticated:Boolean };
}

const accessTokenInitialState = {accessToken:null, accessTokenPayload:null};

const initTokens = (configurationName) => {
    const getOidc =  Oidc.get;
    const oidc = getOidc(configurationName);
    if(oidc.tokens) {
        const tokens = oidc.tokens;
        return {accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload }
    }
    return accessTokenInitialState;
}

type OidcAccessToken = {
    accessToken?: any,
    accessTokenPayload?: any
}

export const useOidcAccessToken =(configurationName=defaultConfigurationName) =>{
    const getOidc =  Oidc.get;
    const [state, setAccessToken] = useState<OidcAccessToken>(initTokens(configurationName));
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

const initIdToken= (configurationName) =>{
    const getOidc =  Oidc.get;
    const oidc = getOidc(configurationName);
    if(oidc.tokens) {
        const tokens = oidc.tokens;
        return { idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload };
    }
    return idTokenInitialState
}

type OidcIdToken = {
    idToken?: any,
    idTokenPayload?: any
}

export const useOidcIdToken =(configurationName= defaultConfigurationName) =>{
    const getOidc =  Oidc.get;
    const [state, setIDToken] = useState<OidcIdToken>(idTokenInitialState);
    const [subscriptionId, setSubscriptionId] = useState(initIdToken(configurationName));

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
