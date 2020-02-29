import { UserManager, WebStorageStateStore, InMemoryWebStorage, UserManagerSettings } from 'oidc-client';
import { oidcLog } from './loggerService';

let userManager: UserManager;

export const setUserManager = (userManagerToSet: UserManager) => {
  userManager = userManagerToSet;
};

export const getUserManager = () => userManager;

export const authenticationServiceInternal = (WebStorageStateStoreInt: any) => (
  configuration: UserManagerSettings,
  UserStore?: any
) => {
  if (userManager) {
    return userManager;
  }
  const overriddenConfiguration = { ...configuration };

  if (UserStore) {
    overriddenConfiguration.userStore = new WebStorageStateStoreInt({ store: new UserStore() });
  }
  oidcLog.debug('overriddenConfiguration', overriddenConfiguration);
  userManager = new UserManager(overriddenConfiguration);
  return userManager;
};

export const authenticationService = authenticationServiceInternal(WebStorageStateStore);

export { InMemoryWebStorage };
