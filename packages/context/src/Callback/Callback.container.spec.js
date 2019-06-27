import React from 'react';
import { render, wait, cleanup } from '@testing-library/react';
import { CallbackContainerCore, onRedirectError, onRedirectSuccess } from './Callback.container';
import '@testing-library/react/cleanup-after-each';

describe('Callback container tests suite', () => {
  const history = {
    push: jest.fn(),
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

  it('should push location if exist when call onRedirectSuccess', () => {
    onRedirectSuccess(history, logger)(userMock);
    expect(history.push).toHaveBeenCalledWith('/url');
  });

  it('should not push if exist location doesnt exists when call onRedirectSuccess', () => {
    onRedirectSuccess(history, logger)({ ...userMock, state: {} });
    expect(history.push).not.toHaveBeenCalled();
  });

  it('Should push on error message when onError is call', () => {
    onRedirectError(history, logger)({ message: 'errorMessage' });
    expect(history.push).toHaveBeenCalledWith(
      '/authentication/not-authenticated?message=errorMessage'
    );
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
  const getUserManager = () => ({
    signinRedirectCallback,
  });
  const historyMock = {
    push: jest.fn(),
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

    expect(signinRedirectCallback).toHaveBeenCalled();
    expect(historyMock.push).toHaveBeenCalledWith('http://myurl.me');
    expect(logger.info).toHaveBeenCalledWith('Successfull login Callback');
  });

  it('should call signinRedirect Callback and onError if signin fail', async () => {
    signinRedirectCallback.mockImplementation(() => Promise.reject({ message: 'error message' }));
    await wait(() =>
      render(
        <CallbackContainerCore
          history={historyMock}
          getUserManager={getUserManager}
          oidcLog={logger}
        />
      )
    );

    expect(signinRedirectCallback).toHaveBeenCalled();
    expect(historyMock.push).toHaveBeenCalledWith(
      '/authentication/not-authenticated?message=error%20message'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'There was an error handling the token callback: error message'
    );
  });
});
