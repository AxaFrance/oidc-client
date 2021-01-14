import React from 'react';
import { useReactOidc } from '@axa-fr/react-oidc-context';
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

const Header = () => {
  const { isEnabled, login, logout, signinSilent, oidcUser } = useReactOidc();
  return (
    <header>
      <div style={headerStyle}>
        <h3>
          <Link style={linkStyle} to="/">
            HOME
          </Link>
        </h3>

        {oidcUser || !isEnabled ? (
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
            <li>
              <Link style={linkStyle} to="/protected1">
                Direct Protected
              </Link>
            </li>
            <li>
              <Link style={linkStyle} to="/protected2">
                HOC Protected
              </Link>
            </li>
            <button onClick={logout}>logout</button>
          </ul>
        ) : (
          <>
            <button onClick={login}>login</button>
            <button onClick={signinSilent}>login - Silent - </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
