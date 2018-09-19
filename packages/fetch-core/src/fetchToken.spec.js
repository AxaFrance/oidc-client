import { fetchWithToken, fetchWrapper } from './fetchToken';

describe('redux-fetch.fetchToken', () => {
  it('should fetchWithToken', async () => {
    const getAccessToken = jest.fn();
    const response = { status: 200 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    const has = () => false;
    const set = (key, value) => console.log(key + value);
    global.Headers = () => ({
      has,
      set,
    });
    const fetchResponse = await fetchWithToken(fetch, getAccessToken)('/a-url');
    expect(fetchResponse).toBe(response);
  });

  it('should select and wrap fetch', async () => {
    const fetch = () => console.log('fetch origin function');
    const props = { fetch };
    const injectedFetch = () => console.log('fetch injected function');
    const newFetch = () => console.log('fetch new function');
    const fetchWithTokenMock = () => newFetch;
    const getAccessTokenMock = jest.fn();

    const newProps = await fetchWrapper(fetchWithTokenMock)(getAccessTokenMock)(injectedFetch)(
      props
    );
    expect(newProps.fetch).toBe(newFetch);
  });
});
