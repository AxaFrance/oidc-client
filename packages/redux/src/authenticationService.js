import { createUserManager } from 'redux-oidc';

let userManager;

export const getUserManager = () => userManager;

const authenticationService = authentication => {
  if (userManager) {
    return userManager;
  }
  userManager = createUserManager(authentication);
  return userManager;
};

export default authenticationService;
