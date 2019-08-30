import { oidcLog } from './loggerService';

let userRequested = false;
export const isRequireAuthentication = (oidcUser, isForce) =>
  isForce || !oidcUser || oidcUser.expired;

export const authenticateUser = (userManager, location) => async (isForce = false) => {
  if (!userManager || !userManager.getUser) {
    return;
  }
  const oidcUser = await userManager.getUser();
  if (isRequireAuthentication(oidcUser, isForce) && !userRequested) {
    oidcLog.info('authenticate user...');
    const url = location.pathname + (location.search || '');
    userRequested = true;
    await userManager.signinRedirect({ data: { url } });
    userRequested = false;
  }
};

export const logoutUser = async userManager => {
  if (!userManager || !userManager.getUser) {
    return;
  }
  const oidcUser = await userManager.getUser();
  if (oidcUser) {
    oidcLog.info('Logout user...');
    await userManager.signoutRedirect();
  }
};

export const signinSilent = getUserManager => (data = undefined) =>
  getUserManager().signinSilent(data);
