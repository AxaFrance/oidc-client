import { compose, withProps } from 'recompose';
import { signinSilent, getUserManager } from '@axa-fr/react-oidc-redux';

export const fetchWithSilentAuthenticateAndRetryOn401 = trySilentAuthenticateInjected => fetch => async (
  url,
  options = { method: 'GET' },
  isRetry = true
) => {
  const response = await fetch(url, options);
  if (isRetry) {
    if (response.status === 401) {
      await trySilentAuthenticateInjected();
      return fetchWithSilentAuthenticateAndRetryOn401(trySilentAuthenticateInjected)(fetch)(
        url,
        options,
        false
      );
    }
  }
  return response;
};

export const wrapAuthenticating = fetchWithSilentAuthenticateAndRetryOn401Injected => (
  fetch = undefined
) => props => {
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithSilentAuthenticateAndRetryOn401Injected(previousFetch);
  const newProps = {
    fetch: newFetch,
  };
  return newProps;
};

const enhance = (fetch = undefined) =>
  compose(
    withProps(
      wrapAuthenticating(fetchWithSilentAuthenticateAndRetryOn401(signinSilent(getUserManager)))(
        fetch
      )
    )
  );

export default enhance;
