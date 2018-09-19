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
