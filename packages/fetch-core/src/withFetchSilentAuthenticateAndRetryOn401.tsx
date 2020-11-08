import React from 'react';
import { getUserManager, signinSilent } from '@axa-fr/react-oidc-core';
import { User } from 'oidc-client';

type TrySigninSilent = (args?: any) => Promise<User>;

const fetchWithSilentAuthenticateAndRetryOn401 = (fetch: typeof window.fetch, trySilentAuthenticateInjected: TrySigninSilent) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' },
  isRetry = true
): Promise<Response> => {
  const response = await fetch(url, options);
  if (isRetry) {
    if (response.status === 401) {
      await trySilentAuthenticateInjected();
      return fetchWithSilentAuthenticateAndRetryOn401(fetch, trySilentAuthenticateInjected)(url, options, false);
    }
  }
  return response;
};

export const wrapAuthenticating = (fetch: typeof window.fetch, trySilentAuthenticateInjected: TrySigninSilent) => (
  WrappedComponent: React.ComponentType
) => (props: any) => {
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithSilentAuthenticateAndRetryOn401(previousFetch, trySilentAuthenticateInjected);
  return <WrappedComponent {...props} fetch={newFetch} />;
};

const withFetchSilentAuthenticateAndRetryOn401 = (fetch: typeof window.fetch = undefined) =>
  wrapAuthenticating(fetch, signinSilent(getUserManager));

export default withFetchSilentAuthenticateAndRetryOn401;
