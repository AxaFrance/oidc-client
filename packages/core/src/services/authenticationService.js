import { UserManager, WebStorageStateStore, InMemoryWebStorage } from 'oidc-client';
import { oidcLog } from './loggerService';

let userManager;

export const setUserManager = userManagerToSet => {
  userManager = userManagerToSet;
};

export const getUserManager = () => userManager;

export const authenticationServiceInternal = WebStorageStateStoreInt => (
  configuration,
  UserStore
) => {
  if (userManager) {
    return userManager;
  }
  const overriddenConfiguration = { ...configuration };

  if (UserStore) {
    overriddenConfiguration.userStore = new WebStorageStateStoreInt({ store: new UserStore() });
  }
  oidcLog.info('overriddenConfiguration', overriddenConfiguration);
  userManager = new UserManager(overriddenConfiguration);
  return userManager;
};

export const authenticationService = authenticationServiceInternal(WebStorageStateStore);

export { InMemoryWebStorage };
