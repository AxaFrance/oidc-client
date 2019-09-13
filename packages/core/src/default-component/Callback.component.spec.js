import * as React from 'react';
import { render } from '@testing-library/react';
import Component from './Callback.component';

describe('Callback.component test suite', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Component />);
    expect(asFragment()).toMatchSnapshot();
  });
});
