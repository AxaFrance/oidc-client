import React from 'react';
import Oidc from "./vanilla/oidc";

type Fetch = typeof window.fetch;
interface ComponentWithFetchProps {
  fetch: Fetch;
}

export const fetchWithToken = (fetch: Fetch, getAccessTokenInjectedAsync: () => Promise<string> | null) => async (
    url: RequestInfo,
    options: RequestInit = { method: 'GET' }
) => {
  let headers = new Headers();
  const optionTmp = { ...options };

  if (optionTmp.headers) {
    headers = !(optionTmp.headers instanceof Headers)
        ? new Headers(optionTmp.headers)
        : optionTmp.headers;
  }

  const accessToken = await getAccessTokenInjectedAsync();
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (!optionTmp.credentials) {
      optionTmp.credentials = 'same-origin';
    }
  }
  const newOptions = { ...optionTmp, headers };
  return await fetch(url, newOptions);
};

export const withOidcFetch = (fetch, configurationName="default") => (
    WrappedComponent
  ) => (props: ComponentWithFetchProps) => {
    const previousFetch = fetch || props.fetch;
    const getOidc =  Oidc.get;

    const getAccessTokenInjectedAysnc = async () => {
      const oidc = getOidc(configurationName);
      await oidc.syncTokensAsync();
      return oidc.tokens.accessToken;
    };
    
    const newFetch = fetchWithToken(previousFetch, getAccessTokenInjectedAysnc);
    return <WrappedComponent {...props} fetch={newFetch} />;
  };

