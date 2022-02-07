import React, {useEffect, useState} from 'react';

import {withFetchToken} from "./oidc/FetchToken";
import {OidcSecure} from "./oidc";

const DisplayUserInfo = ({fetch}) => {
    const [oidcUser, setOidcUser] = useState(null);
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfoAsync = async () => {
            const res = await fetch("https://demo.identityserver.io/connect/userinfo");
            if (res.status != 200) {
                return null;
            }
            return res.json();
        };
        let isMounted = true;
        fetchUserInfoAsync().then((userInfo) => {
            if(isMounted) {
                setLoading(false);
                setOidcUser(userInfo)
            }
        })
        return  () => {
            isMounted = false;
        };
    });
    
    if(isLoading){
        return "Loading";
    }

    return (
        <div className="container mt-3">
            <div className="card text-white bg-success mb-3">
                <div className="card-body">
                    <h5 className="card-title">User information</h5>
                    <p>{oidcUser == null && "You are not logged" }</p>
                    {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
                </div>
            </div>
        </div>
    )
};

// @ts-ignore
const UserInfoWithFetch = withFetchToken(fetch)(DisplayUserInfo);

// @ts-ignore
export const FetchUser =() => <OidcSecure><UserInfoWithFetch/></OidcSecure> 