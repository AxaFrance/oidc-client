import { UserManager } from 'oidc-client';

let userManager;

export const setUserManager = userManagerToSet => {
  userManager = userManagerToSet;
};

export const getUserManager = () => userManager;

export const authenticationService = config => {
  if (userManager) {
    return userManager;
  }
  userManager = new UserManager(config);
  return userManager;
};
