// Link.react.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import NotAuthorized from './NotAuthorized';

test('Render <NotAuthorized/> correctly', () => {
  const component = renderer.create(<NotAuthorized />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
