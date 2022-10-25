import React from 'react';

import { OidcSecure, OidcUserStatus, useOidcAccessToken, useOidcIdToken, useOidcUser } from './oidc';
import { OidcUserInfo } from './oidc/User';

interface OidcUserRoleInfo extends OidcUserInfo{
    role?: string[];
}

const DisplayUserInfo = () => {
    const { oidcUser, oidcUserLoadingState } = useOidcUser<OidcUserRoleInfo>();

    switch (oidcUserLoadingState) {
        case OidcUserStatus.Loading:
            return <p>User Information are loading</p>;
        case OidcUserStatus.Unauthenticated:
            return <p>you are not authenticated</p>;
        case OidcUserStatus.LoadingError:
            return <p>Fail to load user information</p>;
        default:
            return (
                <div className="card text-white bg-success mb-3">
                    <div className="card-body">
                        <h5 className="card-title">User information</h5>
                        <p className="card-text">{JSON.stringify(oidcUser)}</p>
                    </div>
                </div>
            );
    }
};

export const Profile = () => {
    return (
       <div className="container mt-3">
           <DisplayAccessToken/>
           <DisplayIdToken/>
           <DisplayUserInfo/>
        </div>
    );
};

const DisplayAccessToken = () => {
    const { accessToken, accessTokenPayload } = useOidcAccessToken();

    if (!accessToken) {
        return <p>you are not authenticated</p>;
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{ color: 'red', backgroundColor: 'white' }}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. &quot;access_token&quot; and &quot;refresh_token&quot; will never be accessible from your client side javascript.</p>
                {<p className="card-text">Access Token: {JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(accessTokenPayload)}</p>}
            </div>
        </div>
    );
};

const DisplayIdToken = () => {
    const { idToken, idTokenPayload } = useOidcIdToken();

    if (!idToken) {
        return <p>you are not authenticated</p>;
    }

    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">ID Token</h5>
                {<p className="card-text">IdToken: {JSON.stringify(idToken)}</p>}
                {idTokenPayload != null && <p className="card-text">IdToken Payload: {JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    );
};

export const SecureProfile = () => <OidcSecure><Profile /></OidcSecure>;
