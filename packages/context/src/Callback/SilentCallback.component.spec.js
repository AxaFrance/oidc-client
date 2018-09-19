import * as oidc from 'oidc-client';
import Component from './SilentCallback.component';

jest.mock('oidc-client');
jest.mock('../Services');

describe('SilentCallbackcomponent test', () => {
  const userManagerMock = {
    signinSilentCallback: jest.fn(),
  };
  it('Should call signent callback when contruct', () => {
    oidc.UserManager.mockImplementation(() => userManagerMock);
    // eslint-disable-next-line
    const comp = new Component();
    expect(userManagerMock.signinSilentCallback).toBeCalled();
  });
});
