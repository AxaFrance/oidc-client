import * as container from './Callback.container';

jest.mock('../Services');

describe('Callback container tests suite', () => {
  const history = {
    push: jest.fn(),
  };
  const userMock = {
    state: {
      url: '/url',
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should push location if exist when call onRedirectSuccess', () => {
    container.onRedirectSuccess({ history })(userMock);
    expect(history.push).toBeCalledWith('/url');
  });

  it('should not push if exist location doesnt exists when call onRedirectSuccess', () => {
    container.onRedirectSuccess({ history })({ ...userMock, state: {} });
    expect(history.push).not.toBeCalled();
  });

  it('Should push on error message when onError is call', () => {
    container.onRedirectError({ history })({ message: 'errorMessage' });
    expect(history.push).toBeCalledWith('/authentication/not-authentified?message=errorMessage');
  });

  it('Should call signinRedirectCallback and onRedirectSuccess when call componentDidMount', async () => {
    const propsMock = {
      userManager: {
        signinRedirectCallback: jest.fn(() => userMock),
      },
      onRedirectSuccess: jest.fn(),
      onRedirectError: jest.fn(),
    };
    await container.componentDidMountFunction(propsMock);
    expect(propsMock.userManager.signinRedirectCallback).toBeCalled();
    expect(propsMock.onRedirectSuccess).toBeCalledWith(userMock);
  });

  it('Should call signinRedirectCallback and onRedirectError when call componentDidMount and throw error', async () => {
    const propsMock = {
      userManager: {
        signinRedirectCallback: jest.fn(() => {
          throw new Error('woops error');
        }),
      },
      onRedirectSuccess: jest.fn(),
      onRedirectError: jest.fn(),
    };
    await container.componentDidMountFunction(propsMock);
    expect(propsMock.userManager.signinRedirectCallback).toBeCalled();
    expect(propsMock.onRedirectError).toBeCalled();
    expect(propsMock.onRedirectError.mock.calls[0][0].message).toEqual('woops error');
  });
});
