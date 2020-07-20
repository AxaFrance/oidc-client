import React, { useContext } from 'react';
import { User } from 'oidc-client';

import { AuthenticationContext } from '../oidcContext';

export type WithOidcUserProps = { oidcUser: User | null, login : Function, loginPopup: Function, loginSilent: Function };

export function withOidcUser<T extends WithOidcUserProps = WithOidcUserProps>(
  WrappedComponent: React.ComponentType<T>
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithOidcUser = (props: Omit<T, keyof WithOidcUserProps>) => {
    const { oidcUser,login,loginPopup,loginSilent } = useContext(AuthenticationContext);
    return <WrappedComponent oidcUser={oidcUser} login={login} loginPopup={loginPopup} loginSilent={loginSilent} {...(props as T)} />;
  };

  ComponentWithOidcUser.displayName = `withOidcUser(${displayName})`;

  return ComponentWithOidcUser;
}
