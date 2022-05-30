import React, {useEffect, ComponentType} from 'react';
import Oidc, {getLoginParams} from "../../vanilla/oidc";
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
    const loginParams = getLoginParams(configurationName);
    return <OidcSecure configurationName={configurationName} state={loginParams.state} extras={loginParams.extras}>
        <CallBack configurationName={configurationName}/>
    </OidcSecure>;
};

export default CallbackManager;