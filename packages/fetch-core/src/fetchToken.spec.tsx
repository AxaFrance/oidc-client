import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import fetchToken, { fetchWithToken, fetchWrapper } from './fetchToken';

const HeadersBackUp = global.Headers;

describe('fetch-core.fetchToken unit tests', () => {
  afterEach(() => {
    global.Headers = HeadersBackUp;
  });
  it('should fetchWithToken', async () => {
    const getAccessToken = jest.fn(() => 'test-token');
    const response = { status: 200 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    const headers: Record<any, any> = {};
    const has = (key: string): boolean => key in headers;
    const set = (key: string, value: any) => {
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

    const newProps = await fetchWrapper(fetchWithTokenMock)(getAccessTokenMock)(injectedFetch)(props);
    expect(newProps.fetch).toBe(newFetch);
  });
});

describe('fetch-core.fetchToken integration tests', () => {
  let headersMock;
  beforeEach(() => {
    jest.clearAllMocks();
    headersMock = new Headers();
    headersMock.set('custom', 'value');
  });
  const fetchMock = jest.fn();
  const MyComponent = props => {
    const { fetch } = fetchToken(fetchMock)(props);
    return (
      <button type="button" onClick={() => fetch('http://url', { headers : headersMock})}>
        Click
      </button>
    );
  };

  it('should call fetch with correct header with user', () => {
    const { getByRole } = render(<MyComponent user={{ access_token: '##ACCESSTOKEN##' }} />);

    userEvent.click(getByRole('button', { name: 'Click' }));
    expect(fetchMock).toBeCalled();
    expect(fetchMock.mock.calls[0][0]).toEqual('http://url');
    expect(Array.from(fetchMock.mock.calls[0][1].headers.entries())).toEqual([
      ['accept', 'application/json'],
      ['authorization', 'Bearer ##ACCESSTOKEN##'],
      ['custom', 'value'],
    ]);
  });

  it('should call fetch with correct header without user', () => {
    const { getByRole } = render(<MyComponent />);

    userEvent.click(getByRole('button', { name: 'Click' }));
    expect(fetchMock).toBeCalled();
    expect(fetchMock.mock.calls[0][0]).toEqual('http://url');
    expect(Array.from(fetchMock.mock.calls[0][1].headers.entries())).toEqual([['accept', 'application/json'], ['custom', 'value']]);
  });
});
