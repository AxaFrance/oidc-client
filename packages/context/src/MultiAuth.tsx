import React, {useState} from 'react';
import {OidcProvider, useOidc, useOidcAccessToken} from "./oidc";
import { configurationIdentityServer} from "./configurations";

const MultiAuth = ( {configurationName, handleConfigurationChange }) => {
    
    const { login, logout, isLogged} = useOidc(configurationName);

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Work in progress</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect with MultipleAUthentication. 
                        <br/>For example, config_1 can have other sensitive scope, config_2 does not ask for the "offline_access" so it does not retrieve the most sensitive token "refresh_token" for very sensitive operation, it retrive only access_token valid for a small amout of time.</p>
                    <select value={configurationName} onChange={handleConfigurationChange} >
                        <option value="config_1">config_1</option>
                        <option value="config_2">config_2</option>
                    </select>
                    {!isLogged && <button type="button" className="btn btn-primary" onClick={() => login()}>Login</button>}
                    {isLogged && <button type="button" className="btn btn-primary" onClick={logout}>logout</button>}
                </div>
            </div>
        </div>
    )
};

if(!sessionStorage.configurationName){
    sessionStorage.configurationName = "config_1";
}

export const MultiAuthContainer = () => {
    const [configurationName, setConfigurationName] = useState(sessionStorage.configurationName);
    const callBack = "http://localhost:4200/multi-auth/authentification/callback2";
    const configurations = {
        "config_1": {...configurationIdentityServer, redirect_uri:callBack},
        "config_2": {...configurationIdentityServer, redirect_uri:callBack, scope: 'openid profile email api',}
    }
    const handleConfigurationChange = (event) => {
        const configurationName = event.target.value;
        sessionStorage.configurationName = configurationName;
        setConfigurationName(configurationName);
        
    }
    return (
        <OidcProvider configuration={configurations[configurationName]} configurationName={configurationName}>
            <MultiAuth configurationName={configurationName} handleConfigurationChange={handleConfigurationChange} />
            <DisplayAccessToken configurationName={configurationName} />
        </OidcProvider>
    );
};


const DisplayAccessToken = ({configurationName}) => {
    const{ accessToken, accessTokenPayload } = useOidcAccessToken(configurationName);

    if(!accessToken){
        return <p>you are not authentified</p>
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{color:'red', "backgroundColor": 'white'}}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. "access_token" and "refresh_token" will never be accessible from your client side javascript.</p>
                {accessToken != null && <p className="card-text">Access Token: {JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(accessTokenPayload)}</p>}
            </div>
        </div>
    )
};
