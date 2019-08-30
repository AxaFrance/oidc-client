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
    const component = renderer.create(
      <Oidc isEnabled={false} store={{}} configuration={{}}>
        <p>isEnabled</p>
      </Oidc>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
