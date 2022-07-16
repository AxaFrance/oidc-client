import React, {useEffect, ComponentType, useState} from 'react';
import Oidc, {getLoginParams} from "../../vanilla/oidc";
import {OidcSecure} from "../../OidcSecure";
import {getParseQueryStringFromLocation} from "../routes/route-utils";
import {getCustomHistory} from "../routes/withRouter";


const CallbackManager: ComponentType<any> = ({configurationName }) => {

    useEffect(() => {
        let isMounted = true;
        const playCallbackAsync = async () => {
            const getOidc =  Oidc.get;
            const oidc = getOidc(configurationName);
            try {
                await oidc.loginCallbackAsync(true);
                console.log("silient success");
                oidc.silentSigninCallbackFromIFrame();
            } catch (error) {
                console.log("silient error");
                oidc.silentSigninErrorCallbackFromIFrame();
            }
        };
        playCallbackAsync();
        return () => {
            isMounted = false;
        };
    },[]);

    return <></>;
};

export default CallbackManager;