// Link.react.test.js
import React from 'react';
import renderer from 'react-test-renderer';

import Oidc from './Oidc';

jest.mock('redux-oidc', () => ({
  OidcProvider: jest.fn(() => <p>Render Something</p>),
  loadUser: jest.fn(),
}));

describe('redux.Oidc', () => {
  it('Render <Oidc/> correctly', () => {

    const configuration = {
      client_id: 'CSk26fuOE2NjQr17oCI1bKzBch9eUzF0',
      redirect_uri: 'http://localhost:3000/authentication/callback',
      response_type: 'id_token token',
      scope: 'openid profile email',
      authority: 'https://samplesreact.eu.auth0.com',
      silent_redirect_uri:
        'http://localhost:3000/authentication/silent_callback',
      automaticSilentRenew: true,
      loadUserInfo: true,
      triggerAuthFlow: true
    };
    const component = renderer.create(
      <Oidc isEnabled={false} store={{}} configuration={configuration}>
        <p>isEnabled</p>
      </Oidc>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
