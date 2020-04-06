# @axa-fr/react-oidc-context

## About

Easy set up of OIDC for react and use the new react context api as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-context --save

```

### Application startup (index.js)

The library is router agnostic and use native History API.

The default routes used internally :

- www.your-app.fr/authentication/callback
- www.your-app.fr/authentication/silent_callback
- www.your-app.fr/authentication/not-authenticated
- www.your-app.fr/authentication/not-authorized

```javascript
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthenticationProvider, oidcLog } from '@axa-fr/react-oidc-context';
import Header from './Layout/Header';
import Routes from './Router';
import oidcConfiguration from './configuration';

const App = () => (
  <div>
    <Router>
      <AuthenticationProvider configuration={oidcConfiguration} loggerLevel={oidcLog.DEBUG}>
        <Header />
        <Routes />
      </AuthenticationProvider>
    </Router>
  </div>
);

render(<App />, document.getElementById('root'));
```

`AuthenticationProvider` accept the following properties :

```javascript
const propTypes = {
  notAuthenticated: PropTypes.elementType, // react component displayed during authentication
  notAuthorized: PropTypes.elementType, // react component displayed in case user is not Authorised
  authenticating: PropTypes.elementType, // react component displayed when about to redirect user to be authenticated
  callbackComponentOverride: PropTypes.elementType, // react component displayed when user is connected
  sessionLostComponent: PropTypes.elementType, // react component displayed when user loose authentication session
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client configuration, the same as oidc client library used internally https://github.com/IdentityModel/oidc-client-js
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool, //optional, by default to true
    loadUserInfo: PropTypes.bool, //optional, by default to true
    post_logout_redirect_uri: PropTypes.string, // optional
    metadata: PropTypes.shape({
      issuer: PropTypes.string,
      jwks_uri: PropTypes.string,
      authorization_endpoint: PropTypes.string,
      token_endpoint: PropTypes.string,
      userinfo_endpoint: PropTypes.string,
      end_session_endpoint: PropTypes.string,
      revocation_endpoint: PropTypes.string,
      introspection_endpoint: PropTypes.string,
    }),
  }).isRequired,
  isEnabled: PropTypes.bool, // enable/disable the protections and trigger of authentication (useful during development).
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired,
  }),
  UserStore: PropTypes.func,
};
```

Through the UserStore you can specify a class that can be used to store the user object. This class must define :

```javascript
  getItem(key: string): any;
  setItem(key: string, value: any): any;
  removeItem(key: string): any;
  key(index: number): any;
  length?: number;
```
It could also be window.localStorage or window.sessionStorage. By default, without any userStore, the sessionStorage will be used.

See below a sample of configuration, you can have more information about on [oidc client github](https://github.com/IdentityModel/oidc-client-js)

```javascript
const configuration = {
  client_id: 'implicit',
  redirect_uri: 'http://localhost:3000/authentication/callback',
  response_type: 'id_token token',
  post_logout_redirect_uri: 'http://localhost:3000/',
  scope: 'openid profile email',
  authority: 'https://demo.identityserver.io',
  silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
  automaticSilentRenew: true,
  loadUserInfo: true,
};

export default configuration;
```

### Polyfill

oidc-client needs some polyfills to works on Internet Explorer. You can use [core-js](https://github.com/zloirock/core-js) to help you. See [Context Sample](../../examples/context). In the sample we use some polyfills

```javascript
import 'core-js/es/array/from';
import 'core-js/es/array/find';
import 'core-js/es/array/includes';
import 'core-js/es/array/find-index';
import 'core-js/es/array/map';

import 'core-js/es/object/assign';

import 'core-js/es/promise';
import 'core-js/es/map';

import 'core-js/es/string/repeat';
import 'core-js/es/string/pad-start';
import 'core-js/es/string/pad-end';
import 'core-js/es/string/starts-with';

import 'whatwg-fetch';
```

### How to consume : Hooks method (Pages/Dashboard/Dashboard.js)

"useReactOidc" returns all props from the Hook :

```javascript
import React from 'react';
import { useReactOidc } from '@axa-fr/react-oidc-context';

const Dashboard = () => {
  const { oidcUser } = useReactOidc();
  const { profile } = oidcUser;
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Protected Dashboard</p>
      <span>
        Hello {profile.given_name} {profile.family_name}
      </span>
    </div>
  );
};

export default Dashboard;
```

### How to consume : react api context method (Layout/Header.js)

"AuthenticationContext" context contains all props you need

- oidcUser : user information (null if not authenticated)
- logout: logout function
- login: login function
- events: returns events from oidc-client (see [oidc client section about events](https://github.com/IdentityModel/oidc-client-js/wiki#events))

```javascript
import React from 'react';
import { AuthenticationContext } from '@axa-fr/react-oidc-context';
import { Link } from 'react-router-dom';

const headerStyle = {
  display: 'flex',
  backgroundColor: '#26c6da',
  justifyContent: 'space-between',
  padding: 10,
};

const linkStyle = {
  color: 'white',
  textDecoration: 'underline',
};

export default () => (
  <header>
    <AuthenticationContext.Consumer>
      {props => {
        return (
          <div style={headerStyle}>
            <h3>
              <Link style={linkStyle} to="/">
                HOME
              </Link>
            </h3>

            {props.oidcUser ? (
              <ul>
                <li>
                  <Link style={linkStyle} to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link style={linkStyle} to="/admin">
                    Admin
                  </Link>
                </li>
                <button onClick={props.logout}>logout</button>
              </ul>
            ) : (
              <button onClick={props.login}>login</button>
            )}
          </div>
        );
      }}
    </AuthenticationContext.Consumer>
  </header>
);
```

### How to consume : HOC method (Layout/Header.js)

"withOidcUser" function act like "AuthenticationConsumer" below.
"OidcSecure" component trigger authentication in case user is not authenticated. So, the children of that component can be accessible only once you are connected.

```javascript
import React from 'react';
import { withOidcUser, OidcSecure } from '@axa-fr/react-oidc-context';

const Admin = ({ oidcUser }) => (
  <OidcSecure>
    <h1>Admin</h1>
    <p>Protected Admin</p>
    {oidcUser && <p>Bonjour {oidcUser.profile.name}</p>}
  </OidcSecure>
);

// adding the oidc user in the props
export default withOidcUser(Admin);
```

### How to secure a component (Router/Routes.js)

"withOidcSecure" act the same as "OidcSecure" it also trigger authentication in case user is not authenticated.

```javascript
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { withOidcSecure } from '@axa-fr/react-oidc-context';
import Home from '../Pages/Home';
import Dashboard from '../Pages/Dashboard';
import Admin from '../Pages/Admin';

const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route path="/dashboard" component={withOidcSecure(Dashboard)} />
    <Route path="/admin" component={Admin} />
    <Route path="/home" component={Home} />
  </Switch>
);

export default Routes;
```

## Example

- [`create react app & context`](../../examples/context)
