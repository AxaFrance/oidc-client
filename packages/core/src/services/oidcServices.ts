import { oidcLog } from './loggerService';
import { User, UserManager } from 'oidc-client';
import { ReactOidcHistory } from '../routes/withRouter';

let userRequested = false;
let numberAuthentication = 0;

export const isRequireAuthentication = (user: User, isForce?: boolean): boolean =>
  isForce || !user || (user && user.expired === true);

export const isRequireSignin = (oidcUser: User, isForce?: boolean) => isForce || !oidcUser;

export const authenticateUser = (
  userManager: UserManager,
  location: Location,
  history?: ReactOidcHistory,
  user: User = null
) => async (isForce: boolean = false, callbackPath: string = null) => {
  var usePopup = false;
  if (userManager.settings != null && userManager.settings.popup_redirect_uri != null) {
    usePopup = true;
  }
  oidcLog.info('Use Popup: ' + usePopup);
  let oidcUser = user;
  if (!oidcUser) {
    oidcUser = await userManager.getUser();
  }
  if (userRequested) {
    oidcLog.info('User is already requested. No new request will be sent.');
    return;
  }
  numberAuthentication++;
  const url = callbackPath || location.pathname + (location.search || '');

  if (isRequireSignin(oidcUser, isForce)) {
    oidcLog.info('authenticate user...');
    userRequested = true;

    if (usePopup) {
      try {
        await userManager.signinPopup({ data: { url } });
      } catch (e) {
        userRequested = false;
      }

    } else {
      await userManager.signinRedirect({ data: { url } });
    }
    userRequested = false;
  } else if (oidcUser && oidcUser.expired) {
    userRequested = true;
    try {
      await userManager.signinSilent();
    } catch (error) {
      if (numberAuthentication <= 1) {

        if (usePopup) {
          try {
            await userManager.signinPopup({ data: { url } });
          } catch (e) {
            userRequested = false;
          }

        } else {
          await userManager.signinRedirect({ data: { url } });
        }

      } else {
        userRequested = false;
        oidcLog.warn(`session lost ${error.toString()}`);
        history.push(`/authentication/session-lost?path=${encodeURI(url)}`);
      }
    }
    userRequested = false;
  }
};



export const logoutUser = async (userManager: UserManager) => {
  if (!userManager || !userManager.getUser) {
    return;
  }
  const oidcUser = await userManager.getUser();
  if (oidcUser) {
    oidcLog.info('Logout user...');
    await userManager.signoutRedirect();
  }
};

export const signinSilent = (getUserManager: () => UserManager) => (data: any = undefined) =>
  getUserManager().signinSilent(data);
