import { compose, withProps } from 'recompose';
import { getUserManager, signinSilent } from '@axa-fr/react-oidc-core';
import { User } from 'oidc-client';

type TrySigninSilent = (args?: any) => Promise<User>;

const fetchWithSilentAuthenticateAndRetryOn401 = (fetch: typeof window.fetch, trySilentAuthenticateInjected: TrySigninSilent) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' },
  isRetry: boolean = true
): Promise<Response> => {
  const response = await fetch(url, options);
  if (isRetry) {
    if (response.status === 401) {
      await trySilentAuthenticateInjected();
      return fetchWithSilentAuthenticateAndRetryOn401(fetch, trySilentAuthenticateInjected)(
        url,
        options,
        false
      );
    }
  }
  return response;
};

const wrapAuthenticating = (fetch: typeof window.fetch = undefined) => (props: any) => {
  const previousFetch = fetch || props.fetch;
  const trySilentAuthenticateInjected = signinSilent(getUserManager);
  const newFetch = fetchWithSilentAuthenticateAndRetryOn401(
    previousFetch,
    trySilentAuthenticateInjected
  );
  return {
    fetch: newFetch,
  };
};

const enhance = (fetch: typeof window.fetch = undefined) => compose(withProps(wrapAuthenticating(fetch)));

export default enhance;
