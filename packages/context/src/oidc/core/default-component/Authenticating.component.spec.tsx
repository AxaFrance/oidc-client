import * as React from 'react';
import { render } from '@testing-library/react';
import Component from './Authenticating.component';

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Component />);
    expect(asFragment()).toMatchSnapshot();
  });
});
