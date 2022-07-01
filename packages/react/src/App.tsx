import React from 'react';
import {BrowserRouter, Route, Link, Routes} from 'react-router-dom';
import { Home } from "./Home";
import { Profile, SecureProfile } from "./Profile";
import { configurationAuth0, configurationIdentityServer, configurationIdentityServerWithoutDiscovery } from './configurations';
import { withOidcSecure, OidcProvider } from "./oidc";
import {FetchUserHoc, FetchUserHook} from "./FetchUser";
import { MultiAuthContainer } from "./MultiAuth";

const OidcSecureHoc = withOidcSecure(Profile);



function App() {
  const [show, setShow] = React.useState(false);
  const [events, setEvents] = React.useState([]);

  const onEvent=(configurationName, eventName, data )=>{
    console.log(`oidc:${configurationName}:${eventName}`, data);
    const newEvents = [{name: `oidc:${configurationName}:${eventName}`, data}, ...events];
    setEvents(newEvents);
  }
  return (
    <OidcProvider configuration={configurationIdentityServer} onEvent={onEvent}>
      <BrowserRouter>
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
          <a className="navbar-brand" href="/">@axa-fr/react-oidc</a>
          <button className="navbar-toggler" type="button" onClick={() => setShow(!show)} data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"/>
          </button>
          <div style={show ? { display: "block" } : { display: 'none' }} className="collapse navbar-collapse" id="navbarNav">
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
                <Link className="nav-link" to="/user-fetch-secure-hoc">Secure User Fetch Hoc</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/user-fetch-secure-hook">Secure User Fetch Hook</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/multi-auth">Multi Auth</Link>
              </li>
            </ul>
          </div>
        </nav>

        <div>
          <Routes>
            <Route path="/" element={<Home></Home>} />
            <Route path="/profile" element={<Profile></Profile>} />
            <Route path="/profile-secure-component" element={<SecureProfile></SecureProfile>} />
            <Route path="/profile-secure-hoc" element={<OidcSecureHoc></OidcSecureHoc>} />
            <Route path="/user-fetch-secure-hoc" element={<FetchUserHoc></FetchUserHoc>} />
            <Route path="/user-fetch-secure-hook" element={<FetchUserHook></FetchUserHook>} />
            <Route path="/multi-auth/*" element={<MultiAuthContainer></MultiAuthContainer>} />
          </Routes>
        </div>

        <div className="container-fluid mt-3">
          <div className="card">
            <div className="card-body" >
              <h5 className="card-title">Default configuration Events</h5>
              <div style={{"overflowX": "hidden", "overflowY": "scroll", "maxHeight": "400px"}}>
                {events.map(e => {
                  return <p>{e.name}: { JSON.stringify(e.data)}</p>
                })}
              </div>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </OidcProvider>
  );
}

export default App;
