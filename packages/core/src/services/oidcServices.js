import { oidcLog } from './loggerService';

let userRequested = false;

export const isRequireAuthentication= () => true;
    isForce || !user || (user && user.expired === true);

export const isRequireSignin  = (oidcUser, isForce) =>
  isForce || !oidcUser;

export const authenticateUser = (userManager, location, history, user=null) => async (isForce = false) => {
  let oidcUser = user;
  if(!oidcUser)
  {
    oidcUser = await userManager.getUser();
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
