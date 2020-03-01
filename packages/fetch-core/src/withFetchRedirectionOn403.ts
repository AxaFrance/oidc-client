import { compose, withProps } from 'recompose';
import { withRouter } from '@axa-fr/react-oidc-core';

export const fetchWithRedirectionOn403 = (fetch: typeof window.fetch, history: OidcHistory) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' }
) => {
  const response = await fetch(url, options);
  if (response.status === 403) {
    history.push('/authentication/not-authorized');
  }
  return response;
};

export const wrapAuthenticating = (fetchWithRedirectionOn403Injected: typeof fetchWithRedirectionOn403) => (
  fetch: typeof window.fetch = undefined
) => (props: any) => {
  const { history } = props;
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithRedirectionOn403Injected(previousFetch, history);
  return {
    fetch: newFetch,
  };
};

const enhance = (fetch: typeof window.fetch = undefined) =>
  compose(
    withRouter,
    withProps(wrapAuthenticating(fetchWithRedirectionOn403)(fetch))
  );

export default enhance;
