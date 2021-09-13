export { withRouter, ReactOidcHistory, OidcRoutes, useHistory } from './routes';
export { Authenticating, Callback } from './default-component';
export { configurationPropTypes, configurationDefaultProps } from './configurationPropTypes';
export { compose } from './compose';
export {
  getUserManager,
  authenticationService,
  authenticateUser,
  signinSilent,
  logoutUser,
  isRequireAuthentication,
  setLogger,
  oidcLog,
  InMemoryWebStorage,
  UserStoreType,
  setUserManager,
  setBaseRoute,
} from './services';
