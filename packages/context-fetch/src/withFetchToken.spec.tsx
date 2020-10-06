import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthenticationContext } from '@axa-fr/react-oidc-context';
import withFetchToken from './withFetchToken';

describe('withFetchToken tests suite', () => {
  it('should insert token when call new fetch', () => {
    const oidcUser = { access_token: '##ACCESSTOKEN##' };
    const wrapper = ({ children }) => <AuthenticationContext.Provider value={{ oidcUser }}>{children}</AuthenticationContext.Provider>;
    const fetchMock = jest.fn(() => Promise.resolve('ok'));
    const FakeApp = ({ fetch }) => (
      <button type="button" onClick={() => fetch('http://url')}>
        fetch
      </button>
    );
    const TestApp = withFetchToken(fetchMock)(FakeApp);

    render(<TestApp />, { wrapper });

    userEvent.click(screen.getByRole('button', { name: 'fetch' }));
    expect(fetchMock).toBeCalled();
    expect(fetchMock.mock.calls[0][0]).toEqual('http://url');
    expect(Array.from(fetchMock.mock.calls[0][1].headers.entries())).toEqual([
      ['accept', 'application/json'],
      ['authorization', 'Bearer ##ACCESSTOKEN##'],
    ]);
  });
});
