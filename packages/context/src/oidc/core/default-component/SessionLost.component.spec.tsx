import * as React from 'react';
import { render } from '@testing-library/react';
import { SessionLost, SessionLostContainer } from './SessionLost.component';
import { ReactOidcHistory } from '../routes/withRouter';

describe('Session Lost test suite', () => {
  it('SessionLost renders correctly', () => {
    const { asFragment } = render(<SessionLost />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('SessionLostContainer renders correctly', () => {
    const history = ({} as unknown) as ReactOidcHistory;
    const location = ({ search: '/session-lost?path=/previousroute' } as unknown) as Location;
    const { asFragment } = render(<SessionLostContainer history={history} location={location} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
