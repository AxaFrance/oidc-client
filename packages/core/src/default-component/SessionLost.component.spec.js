import * as React from 'react';
import { render } from '@testing-library/react';
import { SessionLost, SessionLostContainer } from './SessionLost.component';

describe('Session Lost test suite', () => {
    it('SessionLost renders correctly', () => {
        const { asFragment } = render(<SessionLost />);
        expect(asFragment()).toMatchSnapshot();
    });

    it('SessionLostContainer renders correctly', () => {
        const history = {};
        const location = { search: "/session-lost?path=/previousroute"};
        const { asFragment } = render(<SessionLostContainer history={history} location={location} />);
        expect(asFragment()).toMatchSnapshot();
    });
});
