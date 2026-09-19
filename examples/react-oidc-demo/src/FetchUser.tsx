import {
  type Fetch,
  OidcSecure,
  type OidcUserInfo,
  useOidcFetch,
  withOidcFetch,
} from '@axa-fr/react-oidc';
import React, { type ReactElement, useEffect, useState } from 'react';

const fetchUserInfoAsync = async (fetch: Fetch): Promise<OidcUserInfo | null> => {
  const response = await fetch('https://demo.duendesoftware.com/connect/userinfo');
  return response.status === 200 ? response.json() : null;
};

const DisplayUserInfo = ({ fetch }: { fetch: Fetch }): ReactElement => {
  const [oidcUser, setOidcUser] = useState<OidcUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchUserInfoAsync(fetch).then(userInfo => {
      if (isMounted) {
        setIsLoading(false);
        setOidcUser(userInfo);
      }
    });
    return () => {
      isMounted = false;
    };
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

export const FetchUserHoc = () => (
  <OidcSecure>
    <UserInfoWithFetchHoc />
  </OidcSecure>
);

export const FetchUserHook = (props: {
  configurationName?: string;
  demonstratingProofOfPossession?: boolean;
}): ReactElement => {
  const { fetch } = useOidcFetch(
    window.fetch,
    props.configurationName,
    props.demonstratingProofOfPossession ?? false,
  );
  return (
    <OidcSecure configurationName={props.configurationName}>
      <DisplayUserInfo fetch={fetch} />
    </OidcSecure>
  );
};
