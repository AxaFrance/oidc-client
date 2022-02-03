﻿﻿import React, {useContext, useEffect, useState} from 'react';
import {OidcContext} from "./OidcProvider";
import Oidc from "./oidc";

export const useReactOidc =() =>{
    const {getOidc} = useContext(OidcContext);
    const login = (callbackPath=undefined) => {
        return getOidc().loginAsync(callbackPath);
    };
    const logout = () => {
        return getOidc().logoutAsync();
    };
    return {login, logout, isLogged: getOidc().tokens != null}
}

export const useReactOidcAccessToken =() =>{
    const {getOidc} = useContext(OidcContext);
    const [accessToken, setAccessToken] = useState<string>(null);
    
    useEffect(() => {
        const oidc = getOidc();
        if(getOidc().tokens != null)
            setAccessToken(getOidc().tokens.accessToken);
        oidc.subscriveEvents((name, data) => {
            if(name == Oidc.eventNames.token_renewed
                || name == Oidc.eventNames.token_aquired){
            
            if(getOidc().tokens != null)
                setAccessToken(getOidc().tokens.accessToken);
            } 
            
        });
    }, []);
    return {accessToken};
}