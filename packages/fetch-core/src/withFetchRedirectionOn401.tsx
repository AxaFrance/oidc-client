﻿import { wrapAuthenticating } from './withFetchRedirectionOn403';

export const fetchWithRedirectionOn401 = (fetch: typeof window.fetch, history: ReactOidcHistory) => async (
  url: RequestInfo,
  options: RequestInit = { method: 'GET' }
) => {
  const response = await fetch(url, options);
  if (response.status === 401) {
    history.push('/authentication/not-authenticated');
  }
  return response;
};

const withFetchRedirectionOn401 = (fetch: typeof window.fetch = undefined) => wrapAuthenticating(fetchWithRedirectionOn401)(fetch);

export default withFetchRedirectionOn401;
