import * as React from 'react';
import { render } from 'react-testing-library';
import Component from './NotAuthenticated.component';

describe('Not Authorize test suite', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Component />);
    expect(asFragment()).toMatchSnapshot();
  });
});
