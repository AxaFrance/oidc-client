import { fetchWithToken, fetchWrapper } from './fetchToken';

describe('redux-fetch.fetchToken', () => {
  it('should fetchWithToken', async () => {
    const getAccessToken = jest.fn(() => 'test-token');
    const response = { status: 200 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    const headers = {};
    const has = key => key in headers;
    const set = (key, value) => {
      headers[key] = value;
    };
    global.Headers = () => ({
      has,
      set,
    });
    const fetchResponse = await fetchWithToken(fetch, getAccessToken)('/a-url');
    expect(headers.Accept).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(fetchResponse).toBe(response);
  });

  it('should fetchWithToken and injected headers', async () => {
    const getAccessToken = jest.fn(() => 'test-token');
    const response = { status: 200 };
    let receivedOptions = null;
    const fetch = (url, options) =>
        new Promise(resolve => {
          receivedOptions = options;
          resolve(response);
        });
    const headers = {};
    const has = key => key in headers;
    const set = (key, value) => {
      headers[key] = value;
    };
    global.Headers = () => ({
      has,
      set,
    });

    const fetchResponseWithCustomHeader = await fetchWithToken(fetch, getAccessToken)('/a-url', {
      credentials: 'include',
    });
    expect(receivedOptions.credentials).toBe('include');
    expect(fetchResponseWithCustomHeader).toBe(response);
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
