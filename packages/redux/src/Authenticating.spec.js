// Link.react.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import Authenticating from './Authenticating';

test('Render <Authenticating/> correctly', () => {
  const component = renderer.create(<Authenticating />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
