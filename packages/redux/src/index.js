import { OidcProvider, loadUser, reducer } from 'redux-oidc';
import { isRequireAuthentication, authenticateUser, signinSilent } from './authenticate';
import authenticationService, { getUserManager } from './authenticationService';

import { oidcSecure } from './OidcSecure';

export { OidcProvider, loadUser, reducer };
export { isRequireAuthentication, authenticateUser, signinSilent };
export { authenticationService, getUserManager };

export { default as Authenticating } from './Authenticating';
export { default as AuthenticationCallback } from './AuthenticationCallback';
export { default as NotAuthenticated } from './NotAuthenticated';
export { default as NotAuthorized } from './NotAuthorized';
export { default as AuthenticationRoutes } from './AuthenticationRoutes';
export { default as AuthenticationSignSilentCallback } from './AuthenticationSignSilentCallback';

export { default as OidcRoutes } from './OidcRoutes';
export { default as Oidc } from './Oidc';
export { default as OidcSecure } from './OidcSecure';
export { oidcSecure };
