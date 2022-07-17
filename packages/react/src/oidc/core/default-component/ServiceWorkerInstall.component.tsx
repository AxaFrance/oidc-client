import React, {useEffect, useState, ComponentType} from 'react';
import AuthenticatingError from "./AuthenticateError.component";
import Oidc, {getLoginParams} from "../../vanilla/oidc";
import Authenticating from "./Authenticating.component";
import {getParseQueryStringFromLocation} from "../routes/route-utils";

const ServiceWorkerInstall: ComponentType<any> = ({callBackError, authenticating, configurationName }) => {
    const getOidc =  Oidc.get;
    const [error, setError] = useState(false);
    const [isLoading, setLoading] = useState(true);

    const CallbackErrorComponent = callBackError || AuthenticatingError;
    const CallbackSuccessComponent = authenticating || Authenticating;

    useEffect(() => {
        let isMounted = true;
        const playCallbackAsync = async () => {
            try {
                const queryParams = getParseQueryStringFromLocation(window.location.href);
                let extras = null;
                for (let [key, value] of Object.entries(queryParams)) {
                    if(key === "state" || key == "callbackPath"){
                        continue;
                    }
                    if(extras === null){
                        extras = {};
                    }
                    extras[key] = value;
                }
                
                // @ts-ignore
                await getOidc(configurationName).loginAsync(queryParams.callbackPath, extras,false, queryParams.state);
                if(isMounted) {
                    setLoading(false);
                }
            } catch (error) {
                if(isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };
        playCallbackAsync();
        return () => {
            isMounted = false;
        };
    },[]);

    if(isLoading){
        return null;
    }

    if(error){
        return <CallbackErrorComponent configurationName={configurationName} />
    }

    return <CallbackSuccessComponent configurationName={configurationName} />;
};

export default ServiceWorkerInstall;
