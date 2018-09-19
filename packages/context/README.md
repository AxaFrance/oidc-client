# @axa-fr/react-oidc-context

## About

Easy set up of OIDC for react and use the new react context api as state management.

## Getting Started

```sh
npm install @axa-fr/react-oidc-context --save
```

### Application startup (index.js)

```javascript
import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthenticationProvider, oidcLog } from '@axa-fr/react-oidc-context';
import Header from './Layout/Header';
import Routes from './Router';
import oidcConfiguration from './configuration';

const origin = document.location.origin;

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

render(<App />, document.getElementById('root'));
```

### How to consume : classic method (Layout/Header.js)

```javascript
import React from 'react';
import { AuthenticationConsumer } from '@axa-fr/react-oidc-context';
import { Link } from 'react-router-dom';

const headerStyle = {
  display: 'flex',
  backgroundColor: '#26c6da',
  justifyContent: 'space-between',
  padding: 10
};

const linkStyle = {
  color: 'white',
  textDecoration: 'underline'
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
