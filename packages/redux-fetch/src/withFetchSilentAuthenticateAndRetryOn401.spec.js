import {
  fetchWithSilentAuthenticateAndRetryOn401,
  wrapAuthenticating,
} from './withFetchSilentAuthenticateAndRetryOn401';

describe('redux-fetch.withFetchSilentAuthenticateAndRetryOn401', () => {
  it('should return props with new fetch', () => {
    const fetch = () => console.log('fetch origin function');
    const props = { location: {}, fetch };
    const newFetch = () => console.log('fetch new function');
    const fetchWithSilentAuthenticateAndRetryOn401Mock = () => newFetch;
    const newProps = wrapAuthenticating(fetchWithSilentAuthenticateAndRetryOn401Mock)(fetch)(props);
    expect(newProps.fetch).toBe(newFetch);
    const newProps2 = wrapAuthenticating(fetchWithSilentAuthenticateAndRetryOn401Mock)()(props);
    expect(newProps2.fetch).toBe(newFetch);
  });

  it('should fetchWithSilentAuthenticateAndRetryOn401', async () => {
    const callback = jest.fn();
    const trySilentAuthenticate = () => {
      callback();
      return new Promise(resolve => {
        resolve({});
      });
    };
    const response = { status: 401 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    await fetchWithSilentAuthenticateAndRetryOn401(trySilentAuthenticate)(fetch)('/a-url');
    response.status = 200;
    await fetchWithSilentAuthenticateAndRetryOn401(trySilentAuthenticate)(fetch)('/a-url');
    expect(callback.mock.calls).toHaveLength(1);
  });
});
