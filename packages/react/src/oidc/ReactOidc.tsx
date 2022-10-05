﻿import React, {useEffect, useState} from 'react';
import {StringMap} from "./vanilla/oidc";
import {VanillaOidc} from "./vanilla/vanillaOidc";

const defaultConfigurationName = "default";

const defaultIsAuthenticated = (getOidc, configurationName) =>{
    let isAuthenticated:boolean = false;
    const oidc = getOidc(configurationName);
    if(oidc){
        isAuthenticated = getOidc(configurationName).tokens != null;
    }
    return isAuthenticated;
}

export const useOidc =(configurationName=defaultConfigurationName) =>{
    const getOidc =  VanillaOidc.get;
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(defaultIsAuthenticated(getOidc, configurationName));

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        setIsAuthenticated(defaultIsAuthenticated(getOidc, configurationName));
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name === VanillaOidc.eventNames.logout_from_another_tab || name === VanillaOidc.eventNames.logout_from_same_tab || name === VanillaOidc.eventNames.token_aquired){
                if(isMounted) {
                    setIsAuthenticated(defaultIsAuthenticated(getOidc, configurationName));
                }
            }
        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    }, [configurationName]);

    const login = (callbackPath:string | undefined = undefined, extras:StringMap=null, silentLoginOnly = false) => {
        return getOidc(configurationName).loginAsync(callbackPath, extras, false, undefined, silentLoginOnly);
    };
    const logout = (callbackPath: string | null | undefined = undefined, extras:StringMap=null) => {
        return getOidc(configurationName).logoutAsync(callbackPath, extras);
    };
    const renewTokens = (extras:StringMap=null) => {
        return getOidc(configurationName).renewTokensAsync(extras);
    };
    return { login, logout, renewTokens, isAuthenticated };
}

const accessTokenInitialState = {accessToken:null, accessTokenPayload:null};

const initTokens = (configurationName) => {
    const getOidc =  VanillaOidc.get;
    const oidc = getOidc(configurationName);
    if(oidc.tokens) {
        const tokens = oidc.tokens;
        return {accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload }
    }
    return accessTokenInitialState;
}

export type OidcAccessToken = {
    accessToken?: any,
    accessTokenPayload?: any
}

export const useOidcAccessToken =(configurationName=defaultConfigurationName) =>{
    const getOidc =  VanillaOidc.get;
    const [state, setAccessToken] = useState<OidcAccessToken>(initTokens(configurationName));

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setAccessToken({accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload });
        }
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == VanillaOidc.eventNames.token_renewed
                || name == VanillaOidc.eventNames.token_aquired 
                || name === VanillaOidc.eventNames.logout_from_another_tab
                || name === VanillaOidc.eventNames.logout_from_same_tab
                || name == VanillaOidc.eventNames.refreshTokensAsync_error
                || name == VanillaOidc.eventNames.syncTokensAsync_error){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setAccessToken(tokens != null  ? {accessToken :tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload } : accessTokenInitialState);
                }
            }
        });
        return  () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    }, [configurationName]);
    return state;
}

const idTokenInitialState = {idToken:null, idTokenPayload:null};

const initIdToken= (configurationName) =>{
    const getOidc =  VanillaOidc.get;
    const oidc = getOidc(configurationName);
    if(oidc.tokens) {
        const tokens = oidc.tokens;
        return { idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload };
    }
    return idTokenInitialState
}

export type OidcIdToken = {
    idToken?: any,
    idTokenPayload?: any
}

export const useOidcIdToken =(configurationName= defaultConfigurationName) =>{
    const getOidc =  VanillaOidc.get;
    const [state, setIDToken] = useState<OidcIdToken>(initIdToken(configurationName));

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc.tokens) {
            const tokens = oidc.tokens;
            setIDToken({idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload});
        }
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == VanillaOidc.eventNames.token_renewed
                || name == VanillaOidc.eventNames.token_aquired
                || name === VanillaOidc.eventNames.logout_from_another_tab
                || name === VanillaOidc.eventNames.logout_from_same_tab
                || name == VanillaOidc.eventNames.refreshTokensAsync_error 
                || name == VanillaOidc.eventNames.syncTokensAsync_error){
                if(isMounted) {
                    const tokens = oidc.tokens;
                    setIDToken(tokens != null  ? {idToken: tokens.idToken, idTokenPayload:tokens.idTokenPayload} : idTokenInitialState);
                }
            }
        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    }, [configurationName]);
    return state;
}
