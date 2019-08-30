import { setDefaultState } from './AuthenticationContext.container';

describe('AuthContext tests suite', () => {
  const userManagerMock = {
    signinSilent: jest.fn(),
  };

  let propsMock;
  let historyMock;
  let onUserUnloadedMock;
  let onUserUnloadedMockReturn;

  const configurationMock = {
    configProps1: 'configValue1',
    configProps2: 'configValue2',
  };

  beforeEach(() => {
    onUserUnloadedMockReturn = jest.fn();
    onUserUnloadedMock = jest.fn(() => onUserUnloadedMockReturn);
    propsMock = {
      isEnabled: true,
      history: historyMock,
      configuration: configurationMock,
      location: 'locationMock',
      onUserUnloaded: onUserUnloadedMock,
    };
    jest.clearAllMocks();
  });

  it('should set default state when call setDefaultState', () => {
    const authenticationServiceMock = jest.fn(() => userManagerMock);
    const defaultState = setDefaultState(propsMock, authenticationServiceMock);
    expect(authenticationServiceMock).toHaveBeenCalledWith(configurationMock);
    expect(defaultState).toEqual({
      isEnabled: true,
      oidcUser: undefined,
      userManager: userManagerMock,
      isLoading: false,
      error: '',
    });
  });
});
