import { compose, withProps } from 'recompose';
import { withRouter } from '@axa-fr/react-oidc-core';
import { wrapAuthenticating } from './withFetchRedirectionOn403';

export const fetchWithRedirectionOn401 = (fetch, history) => async (
  url,
  options = { method: 'GET' }
) => {
  const response = await fetch(url, options);
  if (response.status === 401) {
    history.push('/authentication/not-authenticated');
  }
  return response;
};

const enhance = (fetch = undefined) =>
  compose(
    withRouter,
    withProps(wrapAuthenticating(fetchWithRedirectionOn401)(fetch))
  );

export default enhance;
