import React from "react";
import { UserManager } from "oidc-client";
import { pure } from "recompose";

class AuthenticationSignSilentCallback extends React.Component {
  componentWillMount = () => new UserManager({}).signinSilentCallback();

  render = () => <div />;
}

export default pure(AuthenticationSignSilentCallback);
