import { wrapAuthenticating, fetchWithRedirectionOn403 } from './withFetchRedirectionOn403';

describe('fetch.withFetchRedirectionOn403', () => {
  it('should return props with new fetch', () => {
    const props = { history: {} };
    const fetch = () => console.log('fetch origin function');
    const newFetch = () => console.log('fetch new function');
    const fetchWithRedirectionOn403Mock = () => newFetch;
    const newProps = wrapAuthenticating(fetchWithRedirectionOn403Mock)(fetch)(props);
    expect(newProps.fetch).toBe(newFetch);
    const newProps2 = wrapAuthenticating(fetchWithRedirectionOn403Mock)()(props);
    expect(newProps2.fetch).toBe(newFetch);
  });

  it('should navigate on not-authorized page', async () => {
    const history = { push: jest.fn() };
    const response = { status: 403 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    await fetchWithRedirectionOn403(fetch, history)();
    expect(history.push.mock.calls[0][0]).toBe('/authentication/not-authorized');
    response.status = 200;
    await fetchWithRedirectionOn403(fetch, history)();
    expect(history.push.mock.calls).toHaveLength(1);
  });
});
