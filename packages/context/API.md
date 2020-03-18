# @axa-fr/react-oidc-context API Documentation

## Provider

A simple Way to initiate the provider for the application. Usualy done in the index.js of the application

```javascript
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthenticationProvider } from '@axa-fr/react-oidc-context';

const oidcConfiguration = {
  /// Oidc configuration
};

const App = () => (
  <div>
    <Router>
      <AuthenticationProvider
        configuration={oidcConfiguration}
        loggerLevel={4}
        logger={console}
      >
        /// your application
      </AuthenticationProvider>
    </Router>
  </div>
);
```

Arguments :

- _configuration_ : oidc settings. See [oidc-client wiki](https://github.com/IdentityModel/oidc-client-js/wiki#configuration) for further information.
- _logger_ : Specify a logger (see logger section). Console by default console is used.
- _loggerLevel_ : Specify a level of verbose. None level by default.

React-context-oidc is agnostic router, based on native history API, (for the oidc flow redirections). So you can use any router into your application.

### Logger

React-context-oidc propose to set the logger and the level logger.

In the provider you can specify a logger and a logger level.

- _logger_ : Like for de oidc-client package, logger is a object that support debug, info, warn and error methods that accepts a list a message to print. By default the standard console object is used.
- _loggerLevel_ : verbosity of react-context-oidc Logger and oidc-client logger. You can set a number (0 : None, 1 : Error, 2 : Warn, 3: Info, 4: Debug) or using `oidcLog.NONE`, `oidcLog.ERROR` , `oidcLog.WARN` , `oidcLog.INFO` or `oidcLog.DEBUG`. By default None is selected.

## Consummer

When the user is connected, Api Context Consummer `AuthenticationConsumer` provide props and functions :

- _oidcUser_ : Object for the currently authenticated user returned by oidc Client (see [oidc client Wiki](https://github.com/IdentityModel/oidc-client-js/wiki#user))
- _login_ : Function without parameter that launch the redirect authentication
- _logout_ : Function without parameter that launch the redirect logout
- _error_ : Error if happens
- _isLoading_ : True when the component is loading

Usage :

```javascript
import React from 'react';
import { AuthenticationConsumer } from '@axa-fr/react-oidc-context';

export const myComponent = ()=>{
<AuthenticationConsumer>
  {oidcProps =>{
    return(
      {props.oidcUser ? (
        <H1>Hello {oidcProps.oidcUser.profile.name}</H1>
        <button onClick={props.logout}>logout</button>
      ) : (
        <button onClick={props.login}>login</button>
      )}
    )
  }
}
</AuthenticationConsumer>
}
```

## OidcSecure

A component to wrap another one and protect it.

Usage :

```javascript
import React from 'react';
import { OidcSecure } from '@axa-fr/react-oidc-context';

export const Admin = props => (
  <OidcSecure>
    <h1>Admin</h1>
    <p>Protected Admin</p>
  </OidcSecure>
);
```

## withOidcSecure

A Hoc to protected a component (in a container or in a router for example)

Usage :

```javascript
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { withOidcSecure } from '@axa-fr/react-oidc-context';
import Home from 'Pages/Home';
import Dashboard from 'Pages/Dashboard';

const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route path="/dashboard" component={withOidcSecure(Dashboard)} />
    <Route path="/home" component={Home} />
  </Switch>
);

export default Routes;
```

## withOidcUser

A Hoc that inject the oidc User

Usage :

```javascript
import React from 'react';
import { withOidcUser } from '@axa-fr/react-oidc-context';

const Component = ({ oidcUser }) => (
  <span>Bonjour {oidcUser.profile.name}</span>
);

export default withOidcUser(Component);
```
