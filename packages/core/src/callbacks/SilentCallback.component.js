import React, { useEffect } from 'react';
import { UserManager } from 'oidc-client';

const SilentCallback = ({ logger }) => {
  useEffect(() => {
    new UserManager({}).signinSilentCallback();
    logger.info('callback silent signin successfull');
  });

  return <div />;
};

SilentCallback.defaultProps = {
  logger: console,
};

export default SilentCallback;
