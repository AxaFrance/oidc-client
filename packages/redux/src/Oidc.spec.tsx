// Link.react.test.js
import { render } from '@testing-library/react';
import React from 'react';
import { OidcBaseInternal } from './Oidc';

jest.mock('redux-oidc', () => ({
  OidcProvider: jest.fn(() => <p>Render Something</p>),
}));

describe('redux.Oidc', () => {
  const authenticationServiceMock = jest.fn(() => 'userManager');
  const noopMock = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Render <OidcBaseInternal/> correctly', () => {
    const configuration = {
      client_id: 'CSk26fuOE2NjQr17oCI1bKzBch9eUzF0',
      redirect_uri: 'http://localhost:3000/authentication/callback',
      response_type: 'id_token token',
      scope: 'openid profile email',
      authority: 'https://samplesreact.eu.auth0.com',
      silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
      automaticSilentRenew: true,
      loadUserInfo: true,
      triggerAuthFlow: true,
    };
    const { asFragment } = render(
      <OidcBaseInternal
        store={{ store: 'storeMock' }}
        configuration={configuration}
        authenticationServiceInternal={authenticationServiceMock}
        UserStore={noopMock}
      >
        <p>isEnabled</p>
      </OidcBaseInternal>
    );

    expect(asFragment()).toMatchSnapshot();
    expect(authenticationServiceMock).toHaveBeenCalled();
  });
});
