import { success } from './AuthenticationCallback';

describe('redux.authenticate', () => {
  it('isRequireAuthentication should return if authentication is required', () => {
    const logErrorMock = jest.fn();
    const user = {
      state: {
        url: '/initurl',
      },
    };
    const history = { push: jest.fn() };
    success(logErrorMock)(history)(user);
    expect(history.push.mock.calls).toHaveLength(1);
    success(logErrorMock)(history)(null);
    expect(logErrorMock.mock.calls).toHaveLength(1);
  });
});
