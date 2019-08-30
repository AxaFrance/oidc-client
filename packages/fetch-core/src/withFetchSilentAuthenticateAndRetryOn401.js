import { compose, withProps } from 'recompose';
import { signinSilent, getUserManager } from '@axa-fr/react-oidc-core';

const fetchWithSilentAuthenticateAndRetryOn401 = (fetch, trySilentAuthenticateInjected) => async (
  url,
  options = { method: 'GET' },
  isRetry = true
) => {
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

const wrapAuthenticating = (fetch = undefined) => props => {
  const previousFetch = fetch || props.fetch;
  const trySilentAuthenticateInjected = signinSilent(getUserManager);
  const newFetch = fetchWithSilentAuthenticateAndRetryOn401(
    previousFetch,
    trySilentAuthenticateInjected
  );
  const newProps = {
    fetch: newFetch,
  };
  return newProps;
};

const enhance = (fetch = undefined) => compose(withProps(wrapAuthenticating(fetch)));

export default enhance;
