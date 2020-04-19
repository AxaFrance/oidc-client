import React, { ComponentType } from 'react';
import { User, UserManagerEvents, UserManager } from 'oidc-client';

export type oidcContext = {
  oidcUser: User | null;
  isEnabled: boolean;
  login: Function;
  logout: Function;
  events: UserManagerEvents;
  authenticating: ComponentType;
  isLoading: boolean;
  userManager: UserManager;
  error: string;
};

export const AuthenticationContext = React.createContext<oidcContext>(null);

export const useReactOidc = () => {
  const { isEnabled, login, logout, oidcUser, events } = React.useContext(AuthenticationContext);
  return { isEnabled, login, logout, oidcUser, events };
};
