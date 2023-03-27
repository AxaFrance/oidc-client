import { VanillaOidc } from './vanilla/vanillaOidc.js';

export type Fetch = typeof window.fetch;

export interface ComponentWithOidcFetchProps {
  fetch?: Fetch;
}

const defaultConfigurationName = 'default';

const fetchWithToken = (fetch: Fetch, getOidcWithConfigurationName: () => VanillaOidc | null) => async (...params: Parameters<Fetch>) => {
  const [url, options, ...rest] = params;
  const optionTmp = options ? { ...options } : { method: 'GET' };

  let headers = new Headers();
  if (optionTmp.headers) {
    headers = !(optionTmp.headers instanceof Headers)
        ? new Headers(optionTmp.headers)
        : optionTmp.headers;
  }
  const oidc = getOidcWithConfigurationName();

  // @ts-ignore
  const getValidToken = await oidc.getValidTokenAsync();
  const accessToken = getValidToken?.tokens?.accessToken;

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
  return await fetch(url, newOptions, ...rest);
};

export const withOidcFetch = (fetch: Fetch = null, configurationName = defaultConfigurationName) => (
    WrappedComponent,
  ) => (props: ComponentWithOidcFetchProps) => {
    const { fetch: newFetch } = useOidcFetch(fetch || props.fetch, configurationName);
    return <WrappedComponent {...props} fetch={newFetch} />;
  };

export const useOidcFetch = (fetch: Fetch = null, configurationName = defaultConfigurationName) => {
  const previousFetch = fetch || window.fetch;
  const getOidc = VanillaOidc.get;
  const getOidcWithConfigurationName = () => getOidc(configurationName);
  const newFetch = fetchWithToken(previousFetch, getOidcWithConfigurationName);
  return { fetch: newFetch };
};
