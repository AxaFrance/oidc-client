import React, {useEffect, ComponentType} from 'react';
import Oidc from "../../vanilla/oidc";
import {OidcSecure} from "../../OidcSecure";

const CallBack = ({configurationName}) =>{
    const getOidc =  Oidc.get;
    useEffect(() => {
        let isMounted = true;
        const playCallbackAsync = async () => {
            if(isMounted) {
                const oidc = getOidc(configurationName);
                oidc.silentSigninCallbackFromIFrame();
            }
        };
        playCallbackAsync();

        return () => {
            isMounted = false;
        };
    },[]);
    
    return <></>;
}

const CallbackManager: ComponentType<any> = ({configurationName }) => {
    return <OidcSecure configurationName={configurationName}>
        <CallBack configurationName={configurationName}/>
    </OidcSecure>;
};

export default CallbackManager;