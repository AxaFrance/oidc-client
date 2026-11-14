import {
  Fetch,
  OidcClient,
  ResourceAccessToken,
  ResourceFetchOptions,
  ResourceTokenOptions,
} from '@axa-fr/oidc-client';
import { useCallback, useEffect, useRef, useState } from 'react';

import { warnMissingConfigurationOnce } from './warnMissingConfiguration';

/** Named-client and fetch options for resource-aware React requests. */
export interface OidcResourceFetchOptions extends Omit<ResourceFetchOptions, 'resource'> {
  fetch?: Fetch;
  configurationName?: string;
}

/** Lazily selects the current client and a permitted resource for each request. */
export const useOidcFetchForResource = (
  resource: string,
  options: OidcResourceFetchOptions = {},
): { fetch: Fetch } => {
  const previousFetch = options.fetch ?? window.fetch;
  const configurationName = options.configurationName ?? 'default';
  const isDpop = options.demonstratingProofOfPossession ?? false;
  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const oidc = OidcClient.getOrThrow(configurationName);
      return oidc.fetchForResource(resource, previousFetch, {
        demonstratingProofOfPossession: isDpop,
      })(input, init);
    },
    [resource, previousFetch, configurationName, isDpop],
  );
  return { fetch: authenticatedFetch };
};

/** Resource-token state and explicit asynchronous acquisition/clearing actions. */
export interface OidcResourceTokenState {
  token: ResourceAccessToken | null;
  isLoading: boolean;
  error: Error | null;
  getAccessTokenAsync: (options?: ResourceTokenOptions) => Promise<ResourceAccessToken>;
  clearResourceTokensAsync: () => Promise<void>;
}

interface ResourceTokenSnapshot extends Pick<
  OidcResourceTokenState,
  'token' | 'isLoading' | 'error'
> {
  resource: string;
  configurationName: string;
}

/** Subscribes to one resource without initiating authorization during rendering. */
export const useOidcAccessTokenForResource = (
  resource: string,
  configurationName = 'default',
): OidcResourceTokenState => {
  const readSnapshot = (): ResourceTokenSnapshot => ({
    resource,
    configurationName,
    token: OidcClient.get(configurationName)?.getAccessTokenForResource(resource) ?? null,
    isLoading: false,
    error: null,
  });
  const [snapshot, setSnapshot] = useState<ResourceTokenSnapshot>(readSnapshot);
  if (snapshot.resource !== resource || snapshot.configurationName !== configurationName) {
    setSnapshot(readSnapshot());
  }
  const generation = useRef(0);
  const updateSnapshot = useCallback(
    (value: Partial<Omit<ResourceTokenSnapshot, 'resource' | 'configurationName'>>): void => {
      setSnapshot(previous =>
        previous.resource === resource && previous.configurationName === configurationName
          ? { ...previous, ...value }
          : previous,
      );
    },
    [resource, configurationName],
  );

  useEffect(() => {
    generation.current++;
    const oidc = OidcClient.get(configurationName);
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return () => {
        generation.current++;
      };
    }
    const subscription = oidc.subscribeEvents((name: string, data: unknown) => {
      const isResourceEvent =
        data !== null &&
        typeof data === 'object' &&
        'resource' in data &&
        data.resource === resource;
      if (
        isResourceEvent &&
        name === OidcClient.eventNames.resource_token_error &&
        'error' in data &&
        data.error instanceof Error
      ) {
        updateSnapshot({ error: data.error });
      }
      if (
        (isResourceEvent && name === OidcClient.eventNames.resource_token_cleared) ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.logout_from_another_tab
      ) {
        generation.current++;
        updateSnapshot({ isLoading: false });
      }
      if (
        (isResourceEvent &&
          (name === OidcClient.eventNames.resource_token_acquired ||
            name === OidcClient.eventNames.resource_token_cleared)) ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.logout_from_another_tab
      ) {
        updateSnapshot({ token: oidc.getAccessTokenForResource(resource), error: null });
      }
    });
    return () => {
      generation.current++;
      oidc.removeEventSubscription(subscription);
    };
  }, [resource, configurationName, updateSnapshot]);

  const getAccessTokenAsync = useCallback(
    async (options?: ResourceTokenOptions): Promise<ResourceAccessToken> => {
      const current = generation.current;
      updateSnapshot({ isLoading: true, error: null });
      try {
        const value = await OidcClient.getOrThrow(configurationName).getAccessTokenForResourceAsync(
          resource,
          options,
        );
        if (generation.current === current) updateSnapshot({ token: value });
        return value;
      } catch (cause) {
        if (generation.current === current)
          updateSnapshot({
            error: cause instanceof Error ? cause : new Error('Resource token acquisition failed.'),
          });
        throw cause;
      } finally {
        if (generation.current === current) updateSnapshot({ isLoading: false });
      }
    },
    [resource, configurationName, updateSnapshot],
  );

  const clearResourceTokensAsync = useCallback(async (): Promise<void> => {
    const current = generation.current;
    await OidcClient.getOrThrow(configurationName).clearResourceTokensAsync(resource);
    if (generation.current === current) {
      generation.current++;
      updateSnapshot({ token: null, isLoading: false, error: null });
    }
  }, [resource, configurationName, updateSnapshot]);

  return {
    token:
      snapshot.token?.resource === resource &&
      snapshot.token.configurationName === configurationName
        ? snapshot.token
        : null,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    getAccessTokenAsync,
    clearResourceTokensAsync,
  };
};
