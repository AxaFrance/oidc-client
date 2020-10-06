import React from 'react';
import { useHistory, ReactOidcHistory } from '@axa-fr/react-oidc-core';

export const fetchWithRedirectionOn403 = (fetch: typeof window.fetch, history: ReactOidcHistory) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' }
) => {
  const response = await fetch(url, options);
  if (response.status === 403) {
    history.push('/authentication/not-authorized');
  }
  return response;
};

export const wrapAuthenticating = (fetchWithRedirectioInjected: typeof fetchWithRedirectionOn403) => (fetch: typeof window.fetch) => (
  WrappedComponent: React.ComponentType
) => (props: any) => {
  const history = useHistory();
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithRedirectioInjected(previousFetch, history);
  return <WrappedComponent {...props} fetch={newFetch} />;
};

const withFetchRedirectionOn403 = (fetch: typeof window.fetch = undefined) => wrapAuthenticating(fetchWithRedirectionOn403)(fetch);

export default withFetchRedirectionOn403;
