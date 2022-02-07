import React from 'react';

import {OidcSecure, useOidcAccessToken, useOidcIDToken, useOidcUser} from "./oidc";

const DisplayUserInfo = () => {

    const{ oidcUser, isOidcUserLoading, isLogged } = useOidcUser();

    if(isOidcUserLoading) {
        return <p>User Information are loading</p>
    }

    if(!isLogged){
        return <p>you are not authentified</p>
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
    const{ accessToken } = useOidcAccessToken();

    if(!accessToken){
        return <p>you are not authentified</p>
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{color:'red', "backgroundColor": 'white'}}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. ""access_token" and "refresh_token" will never be accessible from your client side javascript.</p>
                {accessToken != null && <p className="card-text">{JSON.stringify(accessToken)}</p>}
            </div>
        </div>
    )
};


const DisplayIdToken =() => {
    const{ idToken } = useOidcIDToken();

    if(!idToken){
        return <p>you are not authentified</p>
    }
    
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">ID Token</h5>
                {idToken != null && <p className="card-text">{JSON.stringify(idToken)}</p>}
            </div>
        </div>
    );
}


export const SecureProfile = () => <OidcSecure><Profile /></OidcSecure>;