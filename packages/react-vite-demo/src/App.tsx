import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {OidcProvider, TokenRenewMode, useOidc} from "@axa-fr/react-oidc";

export const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: window.location.origin + '/authentication/callback',
    silent_redirect_uri: window.location.origin + '/authentication/silent-callback',
    // silent_login_uri: window.location.origin + '/authentication/silent-login',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.duendesoftware.com',
    // authority_time_cache_wellknowurl_in_second: 60* 60,
    refresh_time_before_tokens_expiration_in_second: 40,
    //service_worker_relative_url: '/OidcServiceWorker.js',
    service_worker_only: false,
    // storage: localStorage,
    // silent_login_timeout: 3333000
    // monitor_session: true,
    extras: { youhou_demo: 'youhou' },
    token_renew_mode: TokenRenewMode.access_token_invalid,
};

function App() {
  const [count, setCount] = useState(0)

  return (
      <OidcProvider configuration={configuration} >
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
        
    <Home/>
    </div>
          </OidcProvider>
  )
}

export const Home = () => {
    const { login, logout, renewTokens, isAuthenticated } = useOidc();

    return (
        <div className="container-fluid mt-3">
                    <p className="card-text">React Demo Application protected by OpenId Connect. More info on about oidc on <a href="https://github.com/AxaGuilDEv/react-oidc">GitHub @axa-fr/react-oidc</a></p>
                    {!isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => login('/profile')}>Login</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout('/profile')}>logout /profile</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={() => logout(null)}>logout whithout callbackredirect</button></p>}
                    {isAuthenticated && <p><button type="button" className="btn btn-primary" onClick={async () => console.log('renewTokens result', await renewTokens())}>renew tokens</button></p>}
        </div>
    );
};


export default App
