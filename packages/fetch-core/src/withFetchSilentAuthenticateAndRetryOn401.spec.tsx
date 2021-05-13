import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { wrapAuthenticating } from './withFetchSilentAuthenticateAndRetryOn401';

describe('withFetchSilentAuthenticateAndRetryOn401 tests suite', () => {
  it('should try silent signin when fetch returns 401', async () => {
    const signinSilent = jest.fn(() => Promise.resolve());
    const fetch = jest.fn(() => Promise.resolve({ status: 401 }));

    const MyComponent = ({ fetch }) => (
      <>
        <button type="button" onClick={fetch}>
          Click
        </button>
      </>
    );
    const MyTestComponent = wrapAuthenticating(fetch, signinSilent)(MyComponent);

    const { getByRole } = render(<MyTestComponent />);

    userEvent.click(getByRole('button', { name: 'Click' }));
    await waitFor(() => expect(signinSilent).toBeCalled());
    expect(fetch).toBeCalledTimes(2);
  });
});
