import { isRequireAuthentication, authenticateUserPure, signinSilent } from './authenticate';

describe('redux.authenticate', () => {
  it('isRequireAuthentication should return if authentication is required', () => {
    const input = { user: {}, isForce: true };
    expect(isRequireAuthentication(input)).toBe(true);
    input.isForce = false;
    expect(isRequireAuthentication(input)).toBe(false);
    input.isForce = false;
    input.user = null;
    expect(isRequireAuthentication(input)).toBe(true);
  });

  it('authenticateUserPure should call signinRedirect method', async () => {
    const isRequireAuthenticationMock = () => true;
    const mockCallback = jest.fn();
    const signinRedirect = () =>
      new Promise(resolve => {
        mockCallback();
        resolve({});
      });
    const location = { pathname: '/test', search: 'user' };
    const localStorage = { setItem: () => {} };
    const userManager = {
      getUser: () =>
        new Promise(resolve => {
          resolve({});
        }),
      signinRedirect,
    };
    await authenticateUserPure(isRequireAuthenticationMock)(userManager, location, localStorage)();

    expect(mockCallback.mock.calls).toHaveLength(1);
  });

  it('trySilentAuthenticate should call signinSilent method', async () => {
    const mockCallback = jest.fn();
    const _signinSilent = () =>
      new Promise(resolve => {
        mockCallback();
        resolve({});
      });

    const getUserManager = () => ({ signinSilent: _signinSilent });
    await signinSilent(getUserManager)();

    expect(mockCallback.mock.calls).toHaveLength(1);
  });
});
