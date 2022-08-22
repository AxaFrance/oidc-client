import React from 'react';
import {useOidc} from "./oidc";

export const Home = () => {

    const { login, logout, renewTokens, isAuthenticated} = useOidc();

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Home</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect. More info on about oidc on <a href="https://github.com/AxaGuilDEv/react-oidc">GitHub @axa-fr/react-oidc</a></p>
                    {!isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button></p>}
                    {!isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => login('/profile', null, "youhou")}>Login with state</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout('/profile')}>logout /profile</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout(null)}>logout whithout callbackredirect</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => renewTokens()}>renew tokens</button></p>}
                </div>
            </div>
        </div>
    )
};
