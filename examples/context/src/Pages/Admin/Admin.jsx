import React from 'react';
import { useReactOidc } from '@axa-fr/react-oidc-context';

const Admin = () => {
  const { oidcUser } = useReactOidc();
  return (
    <>
      <h1>Admin</h1>
      <p>Protected Admin</p>
      {oidcUser && <p>Bonjour {oidcUser.profile.name}</p>}
    </>
  );
};

// adding the oidc user in the props
export default Admin;
