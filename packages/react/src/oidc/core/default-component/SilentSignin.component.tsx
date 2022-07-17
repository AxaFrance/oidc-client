import React, {useEffect, ComponentType} from 'react';
import Oidc from "../../vanilla/oidc";
import {getParseQueryStringFromLocation} from "../../vanilla/route-utils";


const SilentSignin: ComponentType<any> = (({configurationName }) => {
    const queryParams = getParseQueryStringFromLocation(window.location.href);

    const getOidc =  Oidc.get;
    const oidc = getOidc(configurationName);
    
    let extras = null;  

    for (let [key, value] of Object.entries(queryParams)) {
        if(key === "state" || key == "scope"){
            continue;
        }
        if(extras === null){
            extras = {};
        }
        extras[key] = value;
    }
    
    useEffect(() => {
        if(!oidc.tokens){
            oidc.loginAsync(null, extras, true, queryParams.state, true, queryParams.scope);
        }
        return () => {
        }
    }, []);
    
    return <></>;
});

export default SilentSignin;