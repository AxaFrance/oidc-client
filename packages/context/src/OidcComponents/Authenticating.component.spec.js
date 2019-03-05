import * as React from 'react';
import { render } from 'react-testing-library';
import Component from './Authenticating.component';

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Component />);
    expect(asFragment()).toMatchSnapshot();
  });
});
