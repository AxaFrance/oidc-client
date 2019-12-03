import { UserManager } from 'oidc-client';
import {
  setUserManager,
  getUserManager,
  authenticationServiceInternal,
} from './authenticationService';

jest.mock('oidc-client', () => ({
  UserManager: jest.fn(),
}));

describe('AuthenticationService tests suite', () => {
  const userManagerMock = {
    test: 'mock',
  };

  const WebStorageStateStoreMock = jest.fn().mockImplementation(store => store);

  const InMemoryWebStorageMock = jest.fn().mockImplementation(() => ({
    foo: 'bar',
  }));

  beforeEach(() => {
    setUserManager(undefined);
    jest.clearAllMocks();
  });

  it('getUserManager should return the userManager object', () => {
    setUserManager(userManagerMock);
    const userManager = getUserManager();
    expect(userManager).toBe(userManagerMock);
  });

  it('Should return userManager when initiate with a config object', () => {
    const fakeConf = { fake: 'conf' };
    authenticationServiceInternal(WebStorageStateStoreMock)(fakeConf);
    expect(UserManager).toHaveBeenCalledWith(fakeConf);
  });

  it('should oveeride store conf with storeJwtInMemory set to true', () => {
    const fakeConf = { fake: 'conf', storeJwtInMemory: true };
    authenticationServiceInternal(WebStorageStateStoreMock)(fakeConf, InMemoryWebStorageMock);
    expect(UserManager).toHaveBeenCalledWith({
      fake: 'conf',
      storeJwtInMemory: true,
      userStore: { store: { foo: 'bar' } },
    });
  });
});
