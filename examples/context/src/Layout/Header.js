import React from 'react';
import { AuthenticationConsumer } from '@axa-fr/react-oidc-context';
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
    <AuthenticationConsumer>
      {props => {
        return (
          <div style={headerStyle}>
            <h3>
              <Link style={linkStyle} to="/">
                HOME
              </Link>
            </h3>

            {props.oidcUser || !props.isEnabled ? (
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
