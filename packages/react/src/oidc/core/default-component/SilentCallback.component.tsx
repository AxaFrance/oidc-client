import React, {useEffect, ComponentType} from 'react';
import Oidc, {getLoginParams} from "../../vanilla/oidc";
import {OidcSecure} from "../../OidcSecure";
import {getParseQueryStringFromLocation} from "../routes/route-utils";

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
    //const loginParams = getLoginParams(configurationName);
    const queryParams = getParseQueryStringFromLocation(window.location.href);
    console.log(window.location.href)
    console.log(queryParams)
    return <OidcSecure configurationName={configurationName} extras={queryParams}>
        <CallBack configurationName={configurationName}/>
    </OidcSecure>;
};

export default CallbackManager;