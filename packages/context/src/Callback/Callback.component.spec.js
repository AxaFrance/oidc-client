import * as React from 'react';
import renderer from 'react-test-renderer';
import Component from './Callback.component';

describe('callbackcomponent test suite', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<Component />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
