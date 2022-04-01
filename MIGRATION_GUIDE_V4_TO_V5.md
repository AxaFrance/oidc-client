# Migrate from v4 to v5

V5 is a small refactor renaming.

```javascript

// old v4

const { login, logout, isLogged} = useOidc();

// in v4 become

const { login, logout, isAuthenticated} = useOidc(); 
```

Provider properties have changed, you need to keep only required properties for v4 else it won't work.
```javascript
// old v3 
const{ oidcUser, isOidcUserLoading, isLogged } = useOidcUser();

// new v4 
const{ oidcUser, oidcUserLoadingState } = useOidcUser();
```

