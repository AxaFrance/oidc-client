import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import * as oidc from 'oidc-client';
import SilentCallback from './SilentCallback.component';
import { oidcLog } from '../services';

jest.mock('oidc-client');

describe('SilentCallbackcomponent test', () => {
  const userManagerMock = new oidc.UserManager({});
  userManagerMock.signinSilentCallback = jest.fn();
  const loggerMock = ({
    info: jest.fn(),
  } as unknown) as typeof oidcLog;

  it('Should call silent callback when construct', () => {
    (oidc.UserManager as jest.Mock<oidc.UserManager>).mockImplementation(() => userManagerMock);
    let component: ReactTestRenderer;
    act(() => {
      component = renderer.create(<SilentCallback logger={loggerMock} />);
    });
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
    expect(userManagerMock.signinSilentCallback).toHaveBeenCalled();
  });
});
