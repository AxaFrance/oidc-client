import { oidcLog } from './loggerService';

let userRequested = false;
let numberAuthentication = 0;

export const isRequireAuthentication = (user, isForce) =>
  isForce || !user || (user && user.expired === true);

export const isRequireSignin = (oidcUser, isForce) => isForce || !oidcUser;

export const authenticateUser = (userManager, location, history, user = null) => async (
  isForce = false, callbackPath= null,
) => {
  let oidcUser = user;
  if (!oidcUser) {
    oidcUser = await userManager.getUser();
  }
  if (userRequested) {
    return;
  }
  // eslint-disable-next-line no-plusplus
  numberAuthentication++;
  const url = callbackPath || location.pathname + (location.search || '');

  if (isRequireSignin(oidcUser, isForce)) {
    oidcLog.info('authenticate user...');
    userRequested = true;
    await userManager.signinRedirect({ data: { url } });
    userRequested = false;
  } else if (oidcUser && oidcUser.expired) {
    userRequested = true;
    try {
      await userManager.signinSilent();
    } catch (error) {
      if(numberAuthentication <= 1) {
        await userManager.signinRedirect({ data: { url} });
      } else {
        userRequested = false;
        oidcLog.warn(`session lost ${error.toString()}`);
        history.push(`/authentication/session-lost?path=${encodeURI(url)}`);
      }
    }
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
