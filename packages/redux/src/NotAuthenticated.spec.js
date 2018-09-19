// Link.react.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import NotAuthenticated from './NotAuthenticated';

test('Render <NotAuthenticated/> correctly', () => {
  const component = renderer.create(<NotAuthenticated />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
