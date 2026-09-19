import { Fetch, OidcClient } from '@axa-fr/oidc-client';
import { useCallback } from 'react';

export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}

const defaultConfigurationName = 'default';

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
  // useOidcFetch relies on an initialized OIDC configuration to attach
  // the bearer token, so we keep the original fail-fast behaviour.
  const getOidc = OidcClient.getOrThrow;

  const memoizedFetchCallback = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const oidc = getOidc(configurationName);
      const authenticatedFetch = oidc.fetchWithTokens(
        previousFetch,
        demonstratingProofOfPossession,
      );
      return await authenticatedFetch(input, init);
    },
    [previousFetch, configurationName, demonstratingProofOfPossession],
  );
  return { fetch: memoizedFetchCallback };
};
