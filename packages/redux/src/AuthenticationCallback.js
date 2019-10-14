import * as React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { withRouter, getUserManager, oidcLog } from '@axa-fr/react-oidc-core';
import { compose, withProps, pure } from 'recompose';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

const propTypes = {
  history: PropTypes.object.isRequired,
  userManager: PropTypes.object.isRequired,
  callbackComponentOverride: PropTypes.elementType,
};

const defaultProps = {
  callbackComponentOverride: null,
};

export const success = oidcLogInjected => history => user => {
  if (user && user.state) {
    history.push(user.state.url);
  } else {
    oidcLogInjected.error('urlBeforeSignin is null or undefined');
  }
};

const AuthenticationCallback = ({
  history,
  userManager,
  callbackComponentOverride: CallbackComponentOverride,
}) => {
  const successCallback = user => success(oidcLog)(history)(user);

  const errorCallback = error => {
    const { message } = error;
    oidcLog.error(`There was an error handling the token callback: ${message}`);
    history.push(`/authentication/not-authenticated?message=${message}`);
  };

  return (
    <CallbackComponent
      userManager={userManager}
      errorCallback={errorCallback}
      successCallback={successCallback}
    >
      {CallbackComponentOverride ? (
        <CallbackComponentOverride />
      ) : (
        <p>Authentification en cours vous allez être redirigé.</p>
      )}
    </CallbackComponent>
  );
};

AuthenticationCallback.propTypes = propTypes;
AuthenticationCallback.defaultProps = defaultProps;

const wrapUserManager = () => ({ userManager: getUserManager() });

const enhance = compose(
  withRouter,
  withProps(wrapUserManager),
  connect()
);

export default pure(enhance(AuthenticationCallback));
