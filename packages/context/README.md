# @axa-fr/react-oidc-context

## About

Easy set up of OIDC for react and use the new react context api as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-context --save

```

### Application startup (index.js)

"BrowserRouter" should be declared before "AuthentificationProvider".
The library need it to manage and normalise http redirection.

The default routes used internally :

- www.your-app.fr/authentication/callback
- www.your-app.fr/authentication/silent_callback
- www.your-app.fr/authentication/not-authenticated
- www.your-app.fr/authentication/not-authorized

```javascript
import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthenticationProvider, oidcLog } from "@axa-fr/react-oidc-context";
import Header from "./Layout/Header";
import Routes from "./Router";
import oidcConfiguration from "./configuration";

const App = () => (
  <div>
    <Router>
      <AuthenticationProvider
        configuration={oidcConfiguration}
        loggerLevel={oidcLog.DEBUG}
      >
        <Header />
        <Routes />
      </AuthenticationProvider>
    </Router>
  </div>
);

render(<App />, document.getElementById("root"));
```

"Authentificationprovider" accept the following properties :

```javascript
const propTypes = {
  notAuthenticated: PropTypes.node, // react component displayed during authentication
  notAuthorized: PropTypes.node, // react component displayed in case user is not Authorised
  authenticating: PropTypes.node, // react component displayed when about to redirect user to be authenticated
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired, // oidc client configuration, the same as oidc client library used internally https://github.com/IdentityModel/oidc-client-js
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool.isRequired,
    loadUserInfo: PropTypes.bool.isRequired,
    triggerAuthFlow: PropTypes.bool.isRequired
  }).isRequired,
  isEnabled: PropTypes.bool, // enable/disable the protections and trigger of authentication (useful during development).
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired
  })
};
```

See bellow a sample of configuration, you can have more information about on [oidc client github](https://github.com/IdentityModel/oidc-client-js)

```javascript
const configuration = {
  client_id: "implicit",
  redirect_uri: "http://localhost:3000/authentication/callback",
  response_type: "id_token token",
  post_logout_redirect_uri: "http://localhost:3000/",
  scope: "openid profile email",
  authority: "https://demo.identityserver.io",
  silent_redirect_uri: "http://localhost:3000/authentication/silent_callback",
  automaticSilentRenew: true,
  loadUserInfo: true,
  triggerAuthFlow: true
};

export default configuration;
```

### How to consume : react api context consumer method (Layout/Header.js)

"AuthenticationConsumer" component inject to children "props" the properties :

- oidcUser : user information (null if not authenticated)
- logout: logout function
- login: login function

```javascript
import React from "react";
import { AuthenticationConsumer } from "@axa-fr/react-oidc-context";
import { Link } from "react-router-dom";

const headerStyle = {
  display: "flex",
  backgroundColor: "#26c6da",
  justifyContent: "space-between",
  padding: 10
};

const linkStyle = {
  color: "white",
  textDecoration: "underline"
};

export default () => (
  <header>
    <AuthenticationConsumer>
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
    </AuthenticationConsumer>
  </header>
);
```

### How to consume : HOC method (Layout/Header.js)

"withOidcUser" function act like "AuthenticationConsumer" below.
"OidcSecure" component trigger authentication in case user is not authenticated. So, the children of that component can be accessible only once you are connected.

```javascript
import React from "react";
import { withOidcUser, OidcSecure } from "@axa-fr/react-oidc-context";

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
import React from "react";
import { Switch, Route } from "react-router-dom";
import { withOidcSecure } from "@axa-fr/react-oidc-context";
import Home from "../Pages/Home";
import Dashboard from "../Pages/Dashboard";
import Admin from "../Pages/Admin";

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

- [`create react app & context`](./examples/context)
