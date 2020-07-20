export { withRouter, ReactOidcHistory, OidcRoutes } from './routes';
export { Authenticating, Callback } from './default-component';
export { configurationPropTypes, configurationDefaultProps } from './configurationPropTypes';

export {
  getUserManager,
  authenticationService,
  authenticateUser,
  authenticateUserSilent,
  authenticateUserPopup,
  signinSilent,
  logoutUser,
  isRequireAuthentication,
  setLogger,
  oidcLog,
  InMemoryWebStorage,
  UserStoreType,
} from './services';
