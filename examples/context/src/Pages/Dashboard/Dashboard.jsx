import React from 'react';
import { useReactOidc } from '@axa-fr/react-oidc-context';

const Dashboard = () => {
  const { oidcUser, logout } = useReactOidc();
  const { profile } = oidcUser;
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Protected Dashboard</p>
      <p>
        <span>
          Hello {profile.given_name} {profile.family_name}
        </span>
      </p>
      <button onClick={logout}>logout</button>
    </div>
  );
};

export default Dashboard;
