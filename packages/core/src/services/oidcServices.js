import { oidcLog } from './loggerService';

let userRequested = false;

export const isRequireAuthentication= ({ user, isForce }) =>
    isForce || !user || (user && user.expired === true);

export const isRequireSignin  = (oidcUser, isForce) =>
  isForce || !oidcUser;

export const authenticateUser = (userManager, location, history, user) => async (isForce = false) => {
  if (!userManager || !userManager.getUser) {
    return;
  }
  let oidcUser = user;
  if(!oidcUser)
  {
    await userManager.getUser();
  }
  if(userRequested)
  {
    return;
  }
  const url = location.pathname + (location.search || '');
  if (isRequireSignin(oidcUser, isForce)) {
    oidcLog.info('authenticate user...');
    userRequested = true;
    await userManager.signinRedirect({ data: { url } });
    userRequested = false;
  }  else if (oidcUser && oidcUser.expired) {
    userRequested = true;
    try {
      await userManager.signinSilent();
    } catch(error) {
      userRequested = false;
      oidcLog.warn(`session lost ${error.toString()}`);
      history.push(`/authentication/session-lost?url=${encodeURI(url)}`);
    }
    userRequested = false;
  }
};

export const authenticateUserPure = isRequireAuthenticationInjected => (
    userManager, location, user
) => async (isForce = false) => {
  const currentUrl =
      location.pathname + (location.search ? location.search : "");
  const signinRedirect = () =>
      userManager.signinRedirect({ data: { url: currentUrl } });
  if (isRequireAuthenticationInjected({ user, isForce })) {
    await signinRedirect();
  } else if (user && user.expired) {
    try {
      await userManager.signinSilent();
    } catch {
      await signinRedirect();
    }
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
