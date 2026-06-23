import { Fetch, OidcClient } from '@axa-fr/oidc-client';
import { useCallback } from 'react';

import { tryGetOidcClient } from './oidcClientRegistry.js';

export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}

const defaultConfigurationName = 'default';

const fetchWithToken =
  (
    fetch: Fetch,
    getOidcWithConfigurationName: () => OidcClient | null,
    demonstratingProofOfPossession: boolean = false,
  ) =>
  async (...params: Parameters<Fetch>) => {
    const oidc = getOidcWithConfigurationName();
    // When no OIDC client is registered (e.g. in tests / Storybook),
    // fall back to the plain fetch so callers do not crash.
    if (!oidc) {
      return await fetch(...params);
    }
    const newFetch = oidc.fetchWithTokens(fetch, demonstratingProofOfPossession);
    return await newFetch(...params);
  };

export const withOidcFetch =
  (
    fetch: Fetch = null,
    configurationName = defaultConfigurationName,
    demonstratingProofOfPossession: boolean = false,
  ) =>
  WrappedComponent =>
  (props: ComponentWithOidcFetchProps) => {
    const { fetch: newFetch } = useOidcFetch(
      fetch || props.fetch,
      configurationName,
      demonstratingProofOfPossession,
    );
    return <WrappedComponent {...props} fetch={newFetch} />;
  };

export const useOidcFetch = (
  fetch: Fetch = null,
  configurationName = defaultConfigurationName,
  demonstratingProofOfPossession: boolean = false,
) => {
  const previousFetch = fetch || window.fetch;

  const memoizedFetchCallback = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const getOidcWithConfigurationName = () =>
        tryGetOidcClient(configurationName) as OidcClient | null;
      const newFetch = fetchWithToken(
        previousFetch,
        getOidcWithConfigurationName,
        demonstratingProofOfPossession,
      );
      return newFetch(input, init);
    },
    [previousFetch, configurationName, demonstratingProofOfPossession],
  );
  return { fetch: memoizedFetchCallback };
};
