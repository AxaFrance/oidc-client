import * as React from 'react';
import renderer from 'react-test-renderer';
import Component from './Authenticating.component';

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<Component />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
