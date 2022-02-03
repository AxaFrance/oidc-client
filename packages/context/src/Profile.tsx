import React from 'react';

import {OidcSecure, useReactOidcAccessToken, useReactOidcUser} from "./oidc";

const DisplayUserInfo = ({userInfo, accessToken}) => {
    return (
        <div className="card text-white bg-success mb-3">
            <div className="card-body">
                <h5 className="card-title">Userinfo</h5>
                <p>{userInfo == null && "You are not logged" }</p>
                {userInfo != null && <p className="card-text">{JSON.stringify(userInfo)}</p>}
                {accessToken != null && <p className="card-text">{JSON.stringify(accessToken)}</p>}
            </div>
        </div>
    )
};

export const Profile = () => {

    const{ oidcUser, isOidcUserLoading, isLogged } = useReactOidcUser();
    const{ accessToken } = useReactOidcAccessToken();
    
    if(isOidcUserLoading) {
        return <p>User Info are loading</p>
    }
    
   if(!isLogged){
       return <p>you are not authentified</p>
   }

    return (
       <div className="container mt-3">
            <DisplayUserInfo userInfo={oidcUser} accessToken={accessToken}></DisplayUserInfo>
        </div>
    );
}


export const SecureProfile = () => <OidcSecure><Profile /></OidcSecure>;