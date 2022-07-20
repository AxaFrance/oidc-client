# Migrate from v4 to v5

V5 is a small refactor renaming.

```javascript

// old v4

const { login, logout, isLogged} = useOidc();
const{ oidcUser, isOidcUserLoading, isLogged } = useOidcUser();

// in v5 become
const { login, logout, isAuthenticated} = useOidc();
const{ oidcUser, oidcUserLoadingState } = useOidcUser();
```


### Other breaking change

callbackErrorComponent is replaced by authenticatingErrorComponent n OidcProvider component.