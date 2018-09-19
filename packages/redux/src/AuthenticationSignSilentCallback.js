import React from 'react';
import { UserManager } from 'oidc-client';

class AuthenticationSignSilentCallback extends React.Component {
  componentWillMount = () => new UserManager({}).signinSilentCallback();

  render = () => <div />;
}

export default AuthenticationSignSilentCallback;
