import * as React from 'react';
import renderer from 'react-test-renderer';
import Component from './OidcRoutes';

jest.mock('./AuthenticationRoutes', () => jest.fn(() => 'AuthenticationRoutes'));
jest.mock('react-router-dom', () => ({
  Route: 'Route',
  Switch: 'Switch',
}));

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const props = {
      children: 'http://url.com',
      notAuthenticated: 'notAuthenticated',
      notAuthorized: 'notAuthorized',
    };

    const tree = renderer.create(<Component {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
