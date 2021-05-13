import React from 'react';

import { compose } from '@axa-fr/react-oidc-core';
import { useReactOidc } from '@axa-fr/react-oidc-context';
import { fetchToken } from '@axa-fr/react-oidc-fetch-core';

type WindowFetch = typeof fetch;

const withUser = (WrappedComponent: React.ComponentType) => (props: any) => {
  const { oidcUser } = useReactOidc();
  return <WrappedComponent {...props} user={oidcUser} />;
};

const withTokenFromFetchToken = (fetch: WindowFetch) => (WrappedComponent: React.ComponentType) => (props: any) => {
  const { fetch: fetchWithToken } = fetchToken(fetch)(props);
  return <WrappedComponent {...props} fetch={fetchWithToken} />;
};

const withfetchToken = (fetch: WindowFetch) =>
  compose(
    withUser,
    withTokenFromFetchToken(fetch)
  );

export default withfetchToken;
