import React from 'react';
import renderer, { act } from 'react-test-renderer';
import * as oidc from 'oidc-client';
import SilentCallback from './SilentCallback.component';

jest.mock('oidc-client');

describe('SilentCallbackcomponent test', () => {
  const userManagerMock = {
    signinSilentCallback: jest.fn(),
  };
  const loggerMock = {
    info: jest.fn(),
  };

  it('Should call silent callback when construct', () => {
    oidc.UserManager.mockImplementation(() => userManagerMock);
    // eslint-disable-next-line
    let component;
    act(() => {
      component = renderer.create(<SilentCallback logger={loggerMock} />);
    });
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
    expect(userManagerMock.signinSilentCallback).toHaveBeenCalled();
  });
});
