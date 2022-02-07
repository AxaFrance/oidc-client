import React from 'react';
import {useOidc} from "./oidc";

export const Home = () => {

    const { login, logout, isLogged} = useOidc();
    
    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Welcome !!!</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect</p>
                    {!isLogged && <button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button>}
                    {isLogged && <button type="button" className="btn btn-primary" onClick={logout}>logout</button>}
                </div>
            </div>
        </div>
    )
};
