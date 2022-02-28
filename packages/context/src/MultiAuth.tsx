import React, {useState} from 'react';
import {OidcProvider, useOidc} from "./oidc";
import { configurationIdentityServer} from "./configurations";

const MultiAuth = ( {configurationName, handleConfigurationChange }) => {
    
    const { login, logout, isLogged} = useOidc(configurationName);

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Work in progress</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect</p>
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
        </OidcProvider>
    );
};

