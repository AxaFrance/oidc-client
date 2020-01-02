import * as React from 'react';
import { render } from '@testing-library/react';
import Component from './SessionLost.component';

describe('Session Lost test suite', () => {
    it('renders correctly', () => {
        const { asFragment } = render(<Component />);
        expect(asFragment()).toMatchSnapshot();
    });
});
