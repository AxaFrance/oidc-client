import { Fetch, OidcClient } from '@axa-fr/oidc-client';
import { useCallback } from 'react';

export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}

const defaultConfigurationName = 'default';

const fetchWithToken = (fetch: Fetch, getOidcWithConfigurationName: () => OidcClient | null) => async (...params: Parameters<Fetch>) => {
  const [url, options, ...rest] = params;
  const optionTmp = options ? { ...options } : { method: 'GET' };

  let headers = new Headers();
  if (optionTmp.headers) {
    headers = !(optionTmp.headers instanceof Headers)
      ? new Headers(optionTmp.headers)
      : optionTmp.headers;
  }
  const oidc = getOidcWithConfigurationName();

  // @ts-ignore
  const getValidToken = await oidc.getValidTokenAsync();
  const accessToken = getValidToken?.tokens?.accessToken;

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (accessToken) {
    if(oidc.configuration.demonstrating_proof_of_possession){
        const dpop = await oidc.generateProofOfPossessionAsync(accessToken, url.toString(), optionTmp.method);
        headers.set('Authorization', `PoP ${accessToken}`);
        headers.set('DPoP', dpop);
    } else{
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (!optionTmp.credentials) {
      optionTmp.credentials = 'same-origin';
    }
  }
  const newOptions = { ...optionTmp, headers };
  return await fetch(url, newOptions, ...rest);
};

export const withOidcFetch = (fetch: Fetch = null, configurationName = defaultConfigurationName) => (
  WrappedComponent,
) => (props: ComponentWithOidcFetchProps) => {
  const { fetch: newFetch } = useOidcFetch(fetch || props.fetch, configurationName);
  return <WrappedComponent {...props} fetch={newFetch} />;
};

export const useOidcFetch = (fetch: Fetch = null, configurationName = defaultConfigurationName) => {
  const previousFetch = fetch || window.fetch;
  const getOidc = OidcClient.get;

  const memoizedFetchCallback = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const getOidcWithConfigurationName = () => getOidc(configurationName);
      const newFetch = fetchWithToken(previousFetch, getOidcWithConfigurationName);
      return newFetch(input, init);
    },
    [previousFetch, configurationName],
  );
  return { fetch: memoizedFetchCallback };
};
