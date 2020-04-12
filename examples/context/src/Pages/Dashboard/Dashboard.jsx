import React from 'react';
import { useReactOidc } from '@axa-fr/react-oidc-context';

const Dashboard = () => {
  const { oidcUser, logout, events } = useReactOidc();
  const { profile } = oidcUser;
  const addUserEvent = user => console.log(`********* User Loaded :${user.profile} *********`);

  React.useEffect(() => {
    events.addUserLoaded(addUserEvent);
    return () => {
      events.removeUserLoaded(addUserEvent);
    };
  });

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
