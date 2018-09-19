import * as authenticate from './oidcServices';

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

  it('authenticateUser should do nothing if userManager is undefined', () => {
    authenticate.authenticateUser(undefined, locationMock)();
    expect(userManagerMock.getUser).not.toBeCalled();
  });

  it('authenticateUser should get user with authManager setted', async () => {
    await authenticate.authenticateUser(userManagerMock, locationMock)();
    expect(userManagerMock.getUser).toBeCalled();
    expect(userManagerMock.signinRedirect).not.toBeCalled();
  });

  it('authenticateUser should not call signinredirect with a user ', async () => {
    await authenticate.authenticateUser(userManagerMock, locationMock)();
    expect(userManagerMock.getUser).toBeCalled();
    expect(userManagerMock.signinRedirect).not.toBeCalled();
  });

  it('authenticateUser should call signin redirect with force to true', async () => {
    await authenticate.authenticateUser(userManagerMock, locationMock)(true);
    expect(userManagerMock.getUser).toBeCalled();
    expect(userManagerMock.signinRedirect).toBeCalledWith({
      data: { url: '/pathname' },
    });
  });

  it('trySilentAuthenticate Should call signinSilent', async () => {
    const signinSilent = authenticate.signinSilent(() => userManagerMock);
    await signinSilent();
    expect(userManagerMock.signinSilent).toBeCalled();
  });

  it('logoutUser should do nothing if userManager is undefined', () => {
    authenticate.logoutUser(undefined, locationMock);
    expect(userManagerMock.getUser).not.toBeCalled();
  });

  it('logoutUser should get user with authManager settedbut return nothing', async () => {
    userManagerMock.getUser = jest.fn();
    await authenticate.logoutUser(userManagerMock, locationMock);
    expect(userManagerMock.getUser).toBeCalled();
    expect(userManagerMock.signoutRedirect).not.toBeCalled();
  });

  it('logoutUser should call logout with a user ', async () => {
    await authenticate.logoutUser(userManagerMock, locationMock);
    expect(userManagerMock.getUser).toBeCalled();
    expect(userManagerMock.signoutRedirect).toBeCalled();
  });
});
