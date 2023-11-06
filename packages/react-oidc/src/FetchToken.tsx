import { Fetch, OidcClient } from '@axa-fr/oidc-client';
import { useCallback } from 'react';

export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}

const defaultConfigurationName = 'default';

const fetchWithToken = (fetch: Fetch, getOidcWithConfigurationName: () => OidcClient | null) => async (...params: Parameters<Fetch>) => {
  const oidc = getOidcWithConfigurationName();
  return await oidc.getFetchWithTokens(fetch)(params);
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
