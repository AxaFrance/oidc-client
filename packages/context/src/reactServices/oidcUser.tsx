import React, { ComponentType, PropsWithChildren, useContext } from 'react';
import { User } from 'oidc-client';

import { AuthenticationContext } from '../oidcContext';

type WithOidcUserComponentProps = PropsWithChildren<{ oidcUser: User }>;

export const withOidcUser = (Component: ComponentType<WithOidcUserComponentProps>) => (props: WithOidcUserComponentProps) => {
  const { oidcUser } = useContext(AuthenticationContext);
  const { children } = props;
  return (
    <Component {...props} oidcUser={oidcUser}>
      {children}
    </Component>
  );
};
