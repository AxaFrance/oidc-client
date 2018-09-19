// Link.react.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import { OidcBase } from './Oidc';

describe('redux-fetch.withAuthentication', () => {
  it('Render <Oidc/> correctly', () => {
    const component = renderer.create(
      <OidcBase isEnabled={false} store={{}} configuration={{}}>
        <p>isEnabled</p>
      </OidcBase>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
