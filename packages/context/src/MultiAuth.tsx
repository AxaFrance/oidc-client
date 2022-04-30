import React, {useState} from 'react';
import {OidcProvider, useOidc, useOidcAccessToken, useOidcIdToken} from "./oidc";
import { configurationIdentityServer, configurationGoogle} from "./configurations";
import AuthenticatingError from "./override/AuthenticateError.component"
import Authenticating from "./override/Authenticating.component"
import Loading from "./override/Loading.component"
import {CallBackSuccess} from "./override/Callback.component"
import SessionLost from "./override/SessionLost.component"
import ServiceWorkerNotSupported from "./override/ServiceWorkerNotSupported.component"

const MultiAuth = ( {configurationName, handleConfigurationChange }) => {
    const { login, logout, isAuthenticated} = useOidc(configurationName);
    const [fname, setFname] = useState("")

    const handleChange = e => {
        setFname(e.target.value)
    }
    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Multiple Authentication</h5>
                    <form>
                        <label>
                            First Name:{" "}
                            <input type="text" value={fname} onChange={handleChange} />
                        </label>
                    </form>
                    <p className="card-text">React Demo Application protected by OpenId Connect with MultipleAuthentication.
                        <br/>For example, config_1 can have other sensitive scope, config_2 does not ask for the "offline_access" so it does not retrieve the most sensitive token "refresh_token" for very sensitive operation, it retrive only access_token valid for a small amout of time.</p>
                    <select value={configurationName} onChange={handleConfigurationChange} >
                        <option value="config_1">config_1</option>
                        <option value="config_2">config_2</option>
                        <option value="google">google</option>
                    </select>
                    {!isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => login()}>Login</button>}
                    {isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button>}
                </div>
            </div>
        </div>
    );
};

if(!sessionStorage.configurationName){
    sessionStorage.configurationName = "config_1";
}

export const MultiAuthContainer = () => {
    const [isSessionLost, setIsSessionLost] = useState(false)
    const [configurationName, setConfigurationName] = useState(sessionStorage.configurationName);
    const callBack = window.location.origin+"/multi-auth/authentification/callback2";
    const silent_redirect_uri = window.location.origin+"/multi-auth/authentification/silent-callback2";
    const configurations = {
        config_1: {...configurationIdentityServer,
            redirect_uri:callBack,
            silent_redirect_uri,
            scope: 'openid profile email api offline_access'
        },
        config_2: {...configurationIdentityServer,
            redirect_uri:callBack,
            silent_redirect_uri: "",
            scope: 'openid profile email api'},
        google: { ...configurationGoogle }
    }
    const handleConfigurationChange = (event) => {
        const configurationName = event.target.value;
        sessionStorage.configurationName = configurationName;
        setConfigurationName(configurationName);

    }

    const onSessionLost = ()=>{
        setIsSessionLost(true);
    }
    
    return (
        <>
        <OidcProvider configuration={configurations[configurationName]} 
                      configurationName={configurationName}
                      loadingComponent={Loading}
                      authenticatingErrorComponent={AuthenticatingError}
                      authenticatingComponent={Authenticating}
                      serviceWorkerNotSupportedComponent={ServiceWorkerNotSupported}
                      callbackSuccessComponent={CallBackSuccess}
                      onSessionLost={onSessionLost}
        >
            { isSessionLost && <SessionLost configurationName={configurationName}/>}
            <MultiAuth configurationName={configurationName} handleConfigurationChange={handleConfigurationChange} />
            <DisplayAccessToken configurationName={configurationName} />
        </OidcProvider>
    </>
    );
};

const DisplayAccessToken = ({configurationName}) => {
    const{ accessToken, accessTokenPayload } = useOidcAccessToken(configurationName);
    const{ idTokenPayload } = useOidcIdToken(configurationName);

    if(!accessToken){
        return <p>you are not authentified</p>
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{color:'red', "backgroundColor": 'white'}}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. "access_token" and "refresh_token" will never be accessible from your client side javascript.</p>
                {<p className="card-text">Access Token: {JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(accessTokenPayload)}</p>}
                <h5 className="card-title">Id Token</h5>
                {idTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    )
};
