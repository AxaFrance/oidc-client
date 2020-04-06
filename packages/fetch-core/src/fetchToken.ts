import { User } from 'oidc-client';

const getAccessToken = (user: User | null) => (): string | null => {
  if (user) {
    return user.access_token;
  }
  return null;
};

type Fetch = typeof window.fetch;

export const fetchWithToken = (fetch: Fetch, getAccessTokenInjected: () => string | null) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' }
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
  return await fetch(url, newOptions);
};

interface ComponentWithFetchProps {
  fetch: Fetch;
  user?: User | null;
}

export const fetchWrapper = (fetchWithTokenInjected: typeof fetchWithToken) => (
  getAccessTokenInjected: typeof getAccessToken
) => (fetch: Fetch = undefined) => (props: ComponentWithFetchProps) => {
  const previousFetch = fetch || props.fetch;
  const newFetch = fetchWithTokenInjected(previousFetch, getAccessTokenInjected(props.user));
  return {
    fetch: newFetch,
  };
};

export default (fetch: Fetch = undefined) => (props: ComponentWithFetchProps) =>
  fetchWrapper(fetchWithToken)(getAccessToken)(fetch)(props);
