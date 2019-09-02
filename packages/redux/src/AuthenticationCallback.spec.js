import { success } from './AuthenticationCallback';

describe('redux.authenticate', () => {
  it('isRequireAuthentication should return if authentication is required', () => {
    const oidcLogMock = {
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    const user = {
      state: {
        url: '/initurl',
      },
    };
    const history = { push: jest.fn() };
    success(oidcLogMock)(history)(user);
    expect(history.push.mock.calls).toHaveLength(1);
    success(oidcLogMock)(history)(null);
    expect(oidcLogMock.error.mock.calls).toHaveLength(1);
  });
});
