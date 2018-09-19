import * as React from 'react';
import renderer from 'react-test-renderer';
import Component from './AuthenticationRoutes';

jest.mock('../OidcComponents', () => ({
  NotAuthenticated: 'NotAuthenticated',
  NotAuthorized: 'NotAuthorized',
}));
jest.mock('../Callback', () => ({
  Callback: 'Callback',
  SilentCallback: 'SilentCallback',
}));
jest.mock('react-router', () => ({
  Route: 'Route',
  Switch: 'Switch',
}));

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const matchMock = {
      url: 'http://url.com',
    };
    const ComponentRend = Component();
    const tree = renderer.create(<ComponentRend match={matchMock} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
