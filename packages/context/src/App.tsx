import React from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { Home } from "./Home";
import {Profile, SecureProfile} from "./Profile";
import {configurationAuth0, configurationIdentityServer} from './configurations';
import {withOidcSecure,OidcProvider} from "./oidc";
import {FetchUser} from "./FetchUser";
import {MultiAuthContainer} from "./MultiAuth";

function App({configuration=configurationIdentityServer}) {

  return (
    <OidcProvider configuration={configuration}>
      <Router>
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <a className="navbar-brand" href="/">@axa-fr/react-oidc-context</a>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/profile">Profile</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/profile-secure-component">Secure Profile Component</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/profile-secure-hoc">Secure Profile Hoc</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/user-fetch-secure">Secure User Fetch</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/multi-auth">Multi Auth</Link>
              </li>
            </ul>
          </div>
        </nav>

        <div>
          <Route exact path="/" component={Home} />
          <Route exact path="/profile" component={Profile} />
          <Route exact path="/profile-secure-component" component={SecureProfile} />
          <Route exact path="/profile-secure-hoc" component={withOidcSecure(Profile)} />
          <Route exact path="/user-fetch-secure" component={FetchUser} />
          <Route path="/multi-auth" component={MultiAuthContainer} />
        </div>
      </Router>
    </OidcProvider>
  );
}

export default App;
