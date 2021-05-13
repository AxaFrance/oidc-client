import React from 'react';
import { render, wait, cleanup } from '@testing-library/react';
import { CallbackContainerCore, onRedirectError, onRedirectSuccess } from './Callback.container';
import { UserManager } from 'oidc-client';

describe('Callback container tests suite', () => {
  const history = {
    push: jest.fn(),
    replaceCurrent: jest.fn()
  };
  const userMock = {
    state: {
      url: '/url',
    },
  };
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it('should replace location if exist when call onRedirectSuccess', () => {
    onRedirectSuccess(history, logger)(userMock);
    expect(history.replaceCurrent).toHaveBeenCalledWith('/url');
  });

  it('should not push if exist location doesnt exists when call onRedirectSuccess', () => {
    onRedirectSuccess(history, logger)({ ...userMock, state: {} });
    expect(history.push).not.toHaveBeenCalled();
  });

  it('Should send signinRedirect when onError is called', () => {
    const userManagerMock = new UserManager({});
    userManagerMock.signinRedirect = jest.fn();
    onRedirectError(logger, userManagerMock)({ message: 'errorMessage' });
    expect(userManagerMock.signinRedirect).toHaveBeenCalledWith({ data: { url: "/" } });
  });
});

describe('Container integration tests', () => {
  const user = {
    state: {
      url: 'http://myurl.me',
    },
  };
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  const signinRedirectCallback = jest.fn();
  const getUserManager = jest.fn(() => ({
    signinRedirectCallback,
  }));
  const historyMock = {
    push: jest.fn(),
    replaceCurrent: jest.fn()
  };

  beforeEach(() => {
    signinRedirectCallback.mockImplementation(() => Promise.resolve(user));
    jest.clearAllMocks();
  });

  it('should call signinRedirect Callback and OnsucessCallback after all', async () => {
    await wait(() =>
      render(
        <CallbackContainerCore
          history={historyMock}
          getUserManager={getUserManager}
          oidcLog={logger}
        />
      )
    );

    expect(getUserManager).toHaveBeenCalled();
    expect(signinRedirectCallback).toHaveBeenCalled();
    expect(historyMock.replaceCurrent).toHaveBeenCalledWith(user.state.url);
  });

  it('should call signinRedirect Callback and onError if signin fail', async () => {
    const error = { message: 'error message' };
    signinRedirectCallback.mockImplementation(() => Promise.reject(error));

    await wait(() =>
      render(
        <CallbackContainerCore
          history={historyMock}
          getUserManager={getUserManager}
          oidcLog={logger}
        />
      )
    );

    expect(getUserManager).toHaveBeenCalled();
    expect(signinRedirectCallback).toHaveBeenCalled();
    const routeCalled = `/authentication/not-authenticated?message=${encodeURIComponent(
      error.message
    )}`;
    expect(historyMock.push).toHaveBeenCalledWith(routeCalled);
  });
});
