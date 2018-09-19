import * as React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { withRouter } from 'react-router-dom';
import { compose, withProps } from 'recompose';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getUserManager } from './authenticationService';
import { logError } from './logger';

const propTypes = {
  history: PropTypes.object.isRequired,
  userManager: PropTypes.object.isRequired,
};

export const success = logErrorInjected => history => user => {
  if (user && user.state) {
    history.push(user.state.url);
  } else {
    logErrorInjected('urlBeforeSignin is null or undefined');
  }
};

const AuthenticationCallback = ({ history, userManager }) => {
  const successCallback = user => success(logError)(history)(user);

  const errorCallback = error => {
    const { message } = error;
    logError(`There was an error handling the token callback: ${message}`);
    history.push(`/authentication/not-authentified?message=${message}`);
  };

  return (
    <CallbackComponent
      userManager={userManager}
      errorCallback={errorCallback}
      successCallback={successCallback}
    >
      <p>Authentification en cours vous allez être redirigé.</p>
    </CallbackComponent>
  );
};

AuthenticationCallback.propTypes = propTypes;

const wrapUserManager = () => ({ userManager: getUserManager() });

const enhance = compose(
  withRouter,
  withProps(wrapUserManager),
  connect()
);

export default enhance(AuthenticationCallback);
