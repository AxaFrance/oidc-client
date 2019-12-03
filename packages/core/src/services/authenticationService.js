import { UserManager, WebStorageStateStore, InMemoryWebStorage } from 'oidc-client';

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
  const overridenConfiguration = { ...configuration };

  if (UserStore) {
    overridenConfiguration.userStore = new WebStorageStateStoreInt({ store: new UserStore() });
  }
  console.log('overridenConfiguration', overridenConfiguration);
  userManager = new UserManager(overridenConfiguration);
  return userManager;
};

export const authenticationService = authenticationServiceInternal(WebStorageStateStore);

export { InMemoryWebStorage };
