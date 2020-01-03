import * as React from 'react';
import { render } from '@testing-library/react';
import { SessionLost } from './SessionLost.component';

describe('Session Lost test suite', () => {
    it('renders correctly', () => {
        const { asFragment } = render(<SessionLost />);
        expect(asFragment()).toMatchSnapshot();
    });
});
