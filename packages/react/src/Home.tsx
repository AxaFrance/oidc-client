import React, { useCallback, useEffect } from 'react';

import { useOidc, useOidcAccessToken, useOidcIdToken } from './oidc';

export const Home = () => {
    const { login, logout, renewTokens, isAuthenticated } = useOidc();

    // const { oidcUser, oidcUserLoadingState } = useOidcUser();
    const oidcAccessTokenState = useOidcAccessToken();
    const { idTokenPayload } = useOidcIdToken();
    console.warn(idTokenPayload);
    const decorateToken = useCallback(() => {
        const { accessToken } = oidcAccessTokenState; // the accessToken here is always the previous one

        console.log(accessToken);

        // use the accessToken to do other stuffs
    }, [oidcAccessTokenState.accessToken]);

    // sync token on load
    useEffect(() => {
            decorateToken();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oidcAccessTokenState.accessToken]);

    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Home</h5>
                    <p className="card-text">React Demo Application protected by OpenId Connect. More info on about oidc on <a href="https://github.com/AxaGuilDEv/react-oidc">GitHub @axa-fr/react-oidc</a></p>
                    {!isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout('/profile')}>logout /profile</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout(null)}>logout whithout callbackredirect</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => renewTokens()}>renew tokens</button></p>}
                </div>
            </div>
        </div>
    );
};
