import React from 'react';
import { UserManager } from 'oidc-client';

import { oidcLog } from '../Services';

class SilentCallback extends React.Component {
  constructor(props) {
    new UserManager({}).signinSilentCallback();
    oidcLog.info('callback silent signin successfull');
    super(props);
  }

  render = () => <div />;
}

export default SilentCallback;
