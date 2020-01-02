// Link.react.test.js
import React from 'react';
import { render } from '@testing-library/react';
import { OidcBaseInternal } from './Oidc';

jest.mock('redux-oidc', () => ({
  OidcProvider: jest.fn(() => <p>Render Something</p>),
}));

describe('redux.Oidc', () => {
  const loadUserMock = jest.fn();
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
        isEnabled={false}
        store={{ store: 'storeMock' }}
        configuration={configuration}
        loadUserInternal={loadUserMock}
        authenticationServiceInternal={authenticationServiceMock}
        UserStore={noopMock}
      >
        <p>isEnabled</p>
      </OidcBaseInternal>
    );

    expect(asFragment()).toMatchSnapshot();
    expect(authenticationServiceMock).not.toHaveBeenCalled();
    expect(loadUserMock).not.toHaveBeenCalled();
  });

  it('Render <OidcBaseInternal/> correctly when is enabled', () => {
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
        isEnabled
        store={{ store: 'storeMock' }}
        configuration={configuration}
        loadUserInternal={loadUserMock}
        authenticationServiceInternal={authenticationServiceMock}
        UserStore={noopMock}
      >
        <p>isEnabled</p>
      </OidcBaseInternal>
    );
    expect(asFragment()).toMatchSnapshot();
    expect(authenticationServiceMock).toHaveBeenCalledWith(
      {
        authority: 'https://samplesreact.eu.auth0.com',
        automaticSilentRenew: true,
        client_id: 'CSk26fuOE2NjQr17oCI1bKzBch9eUzF0',
        loadUserInfo: true,
        redirect_uri: 'http://localhost:3000/authentication/callback',
        response_type: 'id_token token',
        scope: 'openid profile email',
        silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
        triggerAuthFlow: true,
      },
      noopMock
    );
    expect(loadUserMock).toHaveBeenCalledWith({ store: 'storeMock' }, 'userManager');
  });
});
