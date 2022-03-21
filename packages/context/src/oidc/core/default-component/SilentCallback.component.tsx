import React, { useEffect, useState, PropsWithChildren} from 'react';
import Oidc from "../../vanilla/oidc";
import {OidcSecure} from "../../OidcSecure";

const CallBak = ({configurationName}) =>{
    const getOidc =  Oidc.get;
    useEffect(() => {
        let isMounted = true;
        if(getOidc(configurationName).tokens) {
            const playCallbackAsync = async () => {
                const oidc = getOidc(configurationName);
                oidc.silentSigninCallbackFromIFrame();
            };
            playCallbackAsync();
        }
        return () => {
            isMounted = false;
        };
    },[]);
    
    return <></>;
}

const CallbackManager: PropsWithChildren<any> = ({configurationName }) => {
    return <OidcSecure configurationName={configurationName}>
        <CallBak configurationName={configurationName}/>
    </OidcSecure>;
};

export default CallbackManager;