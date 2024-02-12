import { useOidc, OidcAuthenticateStatus } from '@axa-fr/react-oidc';
import React, {useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import AuthenticatingError from "./override/AuthenticateError.component";
import Authenticating from "./override/Authenticating.component";


/*const createIframeHack =() => {
    const iframe = document.createElement('iframe');
    const html = '<body>Foo<script>alert("youhou");</script></body>';
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
}*/

export const Home = () => {
    const { login, logout, renewTokens,  authenticateStatus  } = useOidc();
    const navigate = useNavigate();

    const navigateProfile = () => {
        navigate("/profile");
    };
    
    /*useEffect(() => {
        createIframeHack();
    }, []);*/
    console.log('authenticateStatus', authenticateStatus);
    
    switch (authenticateStatus) {
        case OidcAuthenticateStatus.AuthenticatingError:
            return (<AuthenticatingError/>);
        case OidcAuthenticateStatus.Loading:
            return (<p>Loading...</p>);
        case OidcAuthenticateStatus.Authenticating:
            return (<Authenticating/>);
        case OidcAuthenticateStatus.AuthenticatingCallback:
            return (<p>Authenticating callback</p>);
        case OidcAuthenticateStatus.SessionLost:
            return (<p>Session Lost</p>);
        case OidcAuthenticateStatus.ServiceWorkerNotSupported:
            return (<p>Service Worker Not Supported</p>);
        default:
            break;
    }
    const isAuthenticated = authenticateStatus === OidcAuthenticateStatus.Authenticated;

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Home</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect. More info on about oidc on <a href="https://github.com/AxaGuilDEv/react-oidc">GitHub @axa-fr/react-oidc</a></p>
                    {!isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout('/profile')}>logout /profile</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout(null, {"no_reload:oidc":"true"})}>logout no reload</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout(null)}>logout whithout callbackredirect</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={async () => console.log('renewTokens result', await renewTokens())}>renew tokens</button></p>}
                    <p><button type="button" className="btn btn-primary" onClick={navigateProfile}>Navigate to profile</button></p>
                </div>
            </div>
        </div>
    );
};
