export { withRouter, OidcRoutes } from './routes';
export { Authenticating, Callback } from './default-component';
export {
  getUserManager,
  authenticationService,
  authenticateUser,
  signinSilent,
  logoutUser,
  isRequireAuthentication,
  setLogger,
  oidcLog,
} from './services';
