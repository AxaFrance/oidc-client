import { authenticateUser, logoutUser, signinSilent } from './oidcServices';

jest.mock('./loggerService');

describe('authenticate testing', () => {
  const userMock = {};
  let userManagerMock;

  const locationMock = {
    pathname: '/pathname',
  };

  beforeEach(() => {
    userManagerMock = {
      getUser: jest.fn(() => userMock),
      signinRedirect: jest.fn(),
      signinSilent: jest.fn(),
      signoutRedirect: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('authenticateUser should not call signinredirect with a user ', async () => {
    await authenticateUser(userManagerMock, locationMock)();
    expect(userManagerMock.getUser).toHaveBeenCalled();
    expect(userManagerMock.signinRedirect).not.toHaveBeenCalled();
  });

  it('authenticateUser should call signin redirect with force to true', async () => {
    await authenticateUser(userManagerMock, locationMock)(true);
    expect(userManagerMock.getUser).toHaveBeenCalled();
    expect(userManagerMock.signinRedirect).toHaveBeenCalledWith({
      data: { url: '/pathname' },
    });
  });

  it('authenticateUser should call signinsilent with user', async () => {
    const userManagerMockLocal = {
      signinSilent: jest.fn(),
    };
    await authenticateUser(userManagerMockLocal, locationMock, null, { expired: true })(false);
    expect(userManagerMockLocal.signinSilent).toHaveBeenCalled();
  });

  it('authenticateUser should call history.push with user', async () => {
    const userManagerMockLocal = {
      signinSilent: jest.fn(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('session expired'));
            }, 300);
          })
      ),
    };
    const historyMock = {
      push: jest.fn(),
    };
    await authenticateUser(userManagerMockLocal, locationMock, historyMock, { expired: true })(
      false
    );
    expect(userManagerMockLocal.signinSilent).toHaveBeenCalled();
    expect(historyMock.push).toHaveBeenCalled();
  });

  it('trySilentAuthenticate Should call signinSilent', async () => {
    const signinSilentMock = signinSilent(() => userManagerMock);
    await signinSilentMock();
    expect(userManagerMock.signinSilent).toHaveBeenCalled();
  });

  it('logoutUser should do nothing if userManager is undefined', () => {
    logoutUser(undefined, locationMock);
    expect(userManagerMock.getUser).not.toHaveBeenCalled();
  });

  it('logoutUser should get user with authManager settedbut return nothing', async () => {
    userManagerMock.getUser = jest.fn();
    await logoutUser(userManagerMock, locationMock);
    expect(userManagerMock.getUser).toHaveBeenCalled();
    expect(userManagerMock.signoutRedirect).not.toHaveBeenCalled();
  });

  it('logoutUser should call logout with a user ', async () => {
    await logoutUser(userManagerMock, locationMock);
    expect(userManagerMock.getUser).toHaveBeenCalled();
    expect(userManagerMock.signoutRedirect).toHaveBeenCalled();
  });
});
