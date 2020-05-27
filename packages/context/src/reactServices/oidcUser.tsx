import React, { useContext } from 'react';
import { User } from 'oidc-client';

import { AuthenticationContext } from '../oidcContext';

export type WithOidcUserProps = { oidcUser: User | null };

export function withOidcUser<T extends WithOidcUserProps = WithOidcUserProps>(
  WrappedComponent: React.ComponentType<T>
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithOidcUser = (props: Omit<T, keyof WithOidcUserProps>) => {
    const { oidcUser } = useContext(AuthenticationContext);
    return <WrappedComponent oidcUser={oidcUser} {...(props as T)} />;
  };

  ComponentWithOidcUser.displayName = `withOidcUser(${displayName})`;

  return ComponentWithOidcUser;
}
