import React, { useEffect, useState } from 'react';

import { OidcSecure } from './oidc';
import { useOidcFetch, withOidcFetch } from './oidc/FetchToken';

const DisplayUserInfo = ({ fetch }) => {
    const [oidcUser, setOidcUser] = useState(null);
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfoAsync = async () => {
            const res = await fetch('https://demo.duendesoftware.com/connect/userinfo');
            if (res.status !== 200) {
                return null;
            }
            return res.json();
        };
        let isMounted = true;
        fetchUserInfoAsync().then((userInfo) => {
            if (isMounted) {
                setLoading(false);
                setOidcUser(userInfo);
            }
        });
        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isLoading) {
        return <>Loading</>;
    }

    return (
        <div className="container mt-3">
            <div className="card text-white bg-success mb-3">
                <div className="card-body">
                    <h5 className="card-title">User information</h5>
                    {oidcUser != null && <p className="card-text">{JSON.stringify(oidcUser)}</p>}
                </div>
            </div>
        </div>
    );
};

const UserInfoWithFetchHoc = withOidcFetch(fetch)(DisplayUserInfo);

export const FetchUserHoc = () => <OidcSecure><UserInfoWithFetchHoc/></OidcSecure>;

export const FetchUserHook = () => {
    const { fetch } = useOidcFetch();
    return <OidcSecure><DisplayUserInfo fetch={fetch} /></OidcSecure>;
};
