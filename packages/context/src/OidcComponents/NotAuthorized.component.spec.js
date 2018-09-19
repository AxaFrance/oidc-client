import * as React from 'react';
import renderer from 'react-test-renderer';
import Component from './NotAuthenticated.component';

describe('Not Authorize test suite', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<Component />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
