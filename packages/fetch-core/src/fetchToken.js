const getAccessToken = user => () => {
  if (user) {
    return user.access_token;
  }
  return null;
};

export const fetchWithToken = (fetch, getAccessTokenInjected) => async (
  url,
  options = { method: 'GET' }
) => {
  // eslint-disable-next-line
  let headers = new Headers();

  if (options.headers) {
    // eslint-disable-next-line
    headers = !(options.headers instanceof Headers)
      ? new Headers(options.headers)
      : options.headers;
  }

  const accessToken = getAccessTokenInjected();
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Credentials', 'same-origin');
  }
  const newOptions = Object.assign(options, { headers });
  const response = await fetch(url, newOptions);
  return response;
};

export const fetchWrapper = fetchWithTokenInjected => getAccessTokenInjected => (
  fetch = undefined
) => props => {
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithTokenInjected(previousFetch, getAccessTokenInjected(props.user));
  const newProps = {
    fetch: newFetch,
  };
  return newProps;
};

export default (fetch = undefined) => props =>
  fetchWrapper(fetchWithToken)(getAccessToken)(fetch)(props);
