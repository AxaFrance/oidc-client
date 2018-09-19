export const isRequireAuthentication = ({ user, isForce }) => isForce || !user;

export const authenticateUserPure = isRequireAuthenticationInjected => (
  userManager,
  location
) => async (isForce = false) => {
  const user = await userManager.getUser();
  if (isRequireAuthenticationInjected({ user, isForce })) {
    const currentUrl = location.pathname + (location.search ? location.search : '');
    await userManager.signinRedirect({ data: { url: currentUrl } });
  }
};

export const authenticateUser = (userManager, location) =>
  authenticateUserPure(isRequireAuthentication)(userManager, location);

export const signinSilent = getUserManager => (data = undefined) =>
  getUserManager().signinSilent(data);
