import { compose, withProps } from 'recompose';
import { withRouter } from 'react-router-dom';

export const fetchWithRedirectionOn403 = (fetch, history) => async (
  url,
  options = { method: 'GET' }
) => {
  const response = await fetch(url, options);
  if (response.status === 403) {
    history.push('/authentication/not-authorized');
  }
  return response;
};

export const wrapAuthenticating = fetchWithRedirectionOn403Injected => (
  fetch = undefined
) => props => {
  const { history } = props;
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithRedirectionOn403Injected(previousFetch, history);
  const newProps = {
    fetch: newFetch,
  };
  return newProps;
};

const enhance = (fetch = undefined) =>
  compose(
    withRouter,
    withProps(wrapAuthenticating(fetchWithRedirectionOn403)(fetch))
  );

export default enhance;
