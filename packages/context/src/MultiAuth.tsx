import React from 'react';
import {OidcProvider, useOidc} from "./oidc";
import {configurationAuth0, configurationIdentityServer} from "./configurations";

const MultiAuth = () => {

    const { login, logout, isLogged} = useOidc("auth0");

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Work in progress</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect</p>
                    {!isLogged && <button type="button" className="btn btn-primary" onClick={() => login()}>Login</button>}
                    {isLogged && <button type="button" className="btn btn-primary" onClick={logout}>logout</button>}
                </div>
            </div>
        </div>
    )
};

const configurationIdentityServer2 = {...configurationIdentityServer, redirect_uri:"http://localhost:4200/multi-auth/authentification/callback2"}
export const MultiAuthContainer = () => {
    return (
        <OidcProvider configuration={configurationIdentityServer2} configurationName="auth0">
            <MultiAuth/>
        </OidcProvider>
    );
};

