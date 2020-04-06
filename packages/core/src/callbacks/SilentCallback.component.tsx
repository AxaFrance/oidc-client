import React, { FC, useEffect } from 'react';
import { UserManager } from 'oidc-client';
import { oidcLog } from '../services';

interface SilentCallbackProps {
  logger?: typeof oidcLog;
}

const SilentCallback: FC<SilentCallbackProps> = ({ logger }) => {
  useEffect(() => {
    new UserManager({}).signinSilentCallback();
    logger.info('callback silent signin successfull');
  });

  return <div />;
};

SilentCallback.defaultProps = {
  logger: oidcLog,
};

export default SilentCallback;
