import { oidcLog } from './loggerService';

export const isRequireAuthentication = (oidcUser, isForce) =>
  isForce || !oidcUser || oidcUser.expired;

export const authenticateUser = (userManager, location) => async (
  isForce = false,
) => {
  if (!userManager || !userManager.getUser) {
    return;
  }
  const oidcUser = await userManager.getUser();
  if (isRequireAuthentication(oidcUser, isForce)) {
    oidcLog.info('authenticate user...');
    const url = location.pathname + (location.search || '');
    await userManager.signinRedirect({ data: { url } });
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

export const signinSilent = getUserManager => () =>
  getUserManager().signinSilent();
