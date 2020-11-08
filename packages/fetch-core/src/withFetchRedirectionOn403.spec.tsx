import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { wrapAuthenticating, fetchWithRedirectionOn403 } from './withFetchRedirectionOn403';

describe('fetch.withFetchRedirectionOn403', () => {
  it('Should sall the new fetch when wrap a component', () => {
    const newFetch = jest.fn();
    const fetchMock = 'FecthMock';
    const fetchWithRedirectionOn403Mock: any = () => newFetch;

    const MyComponent = ({ fetch, test }) => (
      <>
        <button type="button" onClick={fetch}>
          Click
        </button>
        <span>{test}</span>
      </>
    );

    const MyTestComponent = wrapAuthenticating(fetchWithRedirectionOn403Mock)(fetchMock)(MyComponent);
    const { getByText, getByRole } = render(<MyTestComponent test={'Coucou'} />);
    getByText(/Coucou/);

    userEvent.click(getByRole('button', { name: 'Click' }));
    expect(newFetch).toBeCalled();
  });

  it('should navigate on not-authorized page', async () => {
    const history = { push: jest.fn() };
    const response: any = { status: 403 };
    const fetch: any = () =>
      new Promise(resolve => {
        resolve(response);
      });
    await fetchWithRedirectionOn403(fetch, history)('/some/url');
    expect(history.push.mock.calls[0][0]).toBe('/authentication/not-authorized');
    response.status = 200;
    await fetchWithRedirectionOn403(fetch, history)('/some/url');
    expect(history.push.mock.calls).toHaveLength(1);
  });
});
