# Migrate from v4 to v5

V5 is a small refactor that may introduce breaking changes, due to the renaming some properties.

```javascript
// old v4

const { login, logout, isLogged } = useOidc();
const { oidcUser, isOidcUserLoading, isLogged } = useOidcUser();

// in v5 becomes
const { login, logout, isAuthenticated } = useOidc();
const { oidcUser, oidcUserLoadingState } = useOidcUser();
```

## Other breaking change

`callbackErrorComponent` is replaced by `authenticatingErrorComponent` in the `OidcProvider` component.
