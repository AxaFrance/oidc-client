import { UserManager } from 'oidc-client';
import * as authenticationService from './authenticationService';

jest.mock('oidc-client', () => ({
  UserManager: jest.fn(),
}));

describe('AuthenticationService tests suite', () => {
  const userManagerMock = {
    test: 'mock',
  };
  beforeEach(() => {
    authenticationService.setUserManager(userManagerMock);
  });
  it('getUserManager should return the userManager object', () => {
    const userManager = authenticationService.getUserManager();
    expect(userManager).toBe(userManagerMock);
  });

  it('Should return userManager when initiate with a config object', () => {
    authenticationService.setUserManager(undefined);
    const fakeConf = { fake: 'conf' };
    authenticationService.authenticationService(fakeConf);
    expect(UserManager).toBeCalledWith(fakeConf);
  });
});
