import React, {useContext} from 'react';
import {useOidcAccessToken} from "./ReactOidc";
import {OidcContext} from "./OidcProvider";

type Fetch = typeof window.fetch;
interface ComponentWithFetchProps {
  fetch: Fetch;
}

export const fetchWithToken = (fetch: Fetch, getAccessTokenInjected: () => string | null) => async (
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

  const accessToken = getAccessTokenInjected();
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
    const {getOidc} = useContext(OidcContext);

    const getAccessTokenInjected = () => { return getOidc(configurationName).tokens.accessToken; };
    
    const newFetch = fetchWithToken(previousFetch, getAccessTokenInjected);
    return <WrappedComponent {...props} fetch={newFetch} />;
  };

