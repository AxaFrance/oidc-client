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
  let headers = new Headers();
  const optionTmp = { ...options };

  if (optionTmp.headers) {
    headers = !(optionTmp.headers instanceof Headers)
      ? new Headers(optionTmp.headers)
      : optionTmp.headers;
  }

  const accessToken = getAccessTokenInjected();
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (!optionTmp.credentials) {
      optionTmp.credentials = 'same-origin';
    }
  }
  const newOptions = { ...optionTmp, headers };
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
