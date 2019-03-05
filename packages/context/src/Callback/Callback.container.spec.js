import React from 'react';
import * as container from './Callback.container';
import { render, wait } from 'react-testing-library';
import 'react-testing-library/cleanup-after-each';

describe("Callback container tests suite", () => {
  const history = {
    push: jest.fn()
  };
  const userMock = {
    state: {
      url: "/url"
    }
  };
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should push location if exist when call onRedirectSuccess', () => {
    container.onRedirectSuccess(history, logger)(userMock);
    expect(history.push).toBeCalledWith('/url');
  });

  it('should not push if exist location doesnt exists when call onRedirectSuccess', () => {
    container.onRedirectSuccess(history, logger)({ ...userMock, state: {} });
    expect(history.push).not.toBeCalled();
  });

  it('Should push on error message when onError is call', () => {
    container.onRedirectError(history, logger)({ message: 'errorMessage' });
    expect(history.push).toBeCalledWith(
      '/authentication/not-authenticated?message=errorMessage',
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
        <container.CallbackContainer
          history={historyMock}
          getUserManager={getUserManager}
          oidcLog={logger}
        />,
      ),
    );

    expect(signinRedirectCallback).toBeCalled();
    expect(historyMock.push).toBeCalledWith('http://myurl.me');
    expect(logger.info).toBeCalledWith('Successfull login Callback');
  });

  it('should call signinRedirect Callback and onError if signin fail', async () => {
    signinRedirectCallback.mockImplementation(() =>
      Promise.reject({ message: 'error message' }),
    );
    await wait(() =>
      render(
        <container.CallbackContainer
          history={historyMock}
          getUserManager={getUserManager}
          oidcLog={logger}
        />,
      ),
    );

    expect(signinRedirectCallback).toBeCalled();
    expect(historyMock.push).toBeCalledWith(
      '/authentication/not-authenticated?message=error%20message',
    );
    expect(logger.error).toBeCalledWith(
      'There was an error handling the token callback: error message',
    );
  });
});
