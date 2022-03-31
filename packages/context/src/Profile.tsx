import React from 'react';

import {OidcSecure, useOidc, useOidcAccessToken, useOidcIdToken, useOidcUser} from "./oidc";
import {UserStatus} from "./oidc/User";

const DisplayUserInfo = () => {
    const{ oidcUser, isOidcUserLoading } = useOidcUser();

    if(isOidcUserLoading !== UserStatus.Loaded) {
        return <p>User Information are loading</p>
    }

    if(!oidcUser){
        return <p>you are not authenticated</p>
    }

    return (
        <div className="card text-white bg-success mb-3">
            <div className="card-body">
                <h5 className="card-title">User information</h5>
                <p>{oidcUser == null && "You are not logged" }</p>
                {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
            </div>
        </div>
    )
};

export const Profile = () => {

    return (
       <div className="container mt-3">
           <DisplayAccessToken/>
           <DisplayIdToken/>
           <DisplayUserInfo/>
        </div>
    );
}

const DisplayAccessToken = () => {
    const{ accessToken, accessTokenPayload } = useOidcAccessToken();

    if(!accessToken){
        return <p>you are not authenticated</p>
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


const DisplayIdToken =() => {
    const{ idToken, idTokenPayload } = useOidcIdToken();

    if(!idToken){
        return <p>you are not authenticated</p>
    }

    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">ID Token</h5>
                {idToken != null && <p className="card-text">IdToken: {JSON.stringify(idToken)}</p>}
                {idTokenPayload != null && <p className="card-text">IdToken Payload: {JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    );
}


export const SecureProfile = () => <OidcSecure><Profile /></OidcSecure>;
