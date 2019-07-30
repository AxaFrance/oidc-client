export const isRequireAuthentication = ({ user, isForce }) => isForce || !user;

export const authenticateUserPure = isRequireAuthenticationInjected => (
  userManager,
  location
) => async (isForce = false) => {
  const user = await userManager.getUser();
  const currentUrl = location.pathname + (location.search ? location.search : '');
  const signinRedirect = () => userManager.signinRedirect({ data: { url: currentUrl } });
  if (isRequireAuthenticationInjected({ user, isForce })) {
    await signinRedirect;
  } else if(user && user.expired) {
    try {
      await userManager.signinSilent();
    } catch {
      await signinRedirect();
    }
  }
};

export const authenticateUser = (userManager, location) =>
  authenticateUserPure(isRequireAuthentication)(userManager, location);

export const signinSilent = getUserManager => (data = undefined) =>
  getUserManager().signinSilent(data);
