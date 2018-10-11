import React from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import {
  compose,
  withHandlers,
  withState,
  lifecycle,
  withProps
} from "recompose";

import {
  authenticationService,
  authenticateUser,
  logoutUser,
  setLogger,
  oidcLog
} from "../Services";
import AuthenticationProviderComponent from "./AuthenticationContext";
import { AuthenticationContext } from "./AuthenticationContextCreator";

const propTypes = {
  notAuthentified: PropTypes.node,
  notAuthorized: PropTypes.node,
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired,
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool.isRequired,
    loadUserInfo: PropTypes.bool.isRequired,
    triggerAuthFlow: PropTypes.bool.isRequired
  }).isRequired,
  isEnabled: PropTypes.bool,
  location: PropTypes.string,
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired
  })
};

const defaultProps = {
  notAuthentified: null,
  notAuthorized: null,
  isEnabled: true,
  loggerLevel: 0,
  logger: console
};

export const onUserLoaded = props => user => {
  oidcLog.info(`User Loaded`);
  props.setOidcState({
    ...props.oidcState,
    oidcUser: user,
    isLoading: false
  });
};

export const onUserUnloaded = props => () => {
  oidcLog.info(`User unloaded `);
  props.setOidcState({
    ...props.oidcState,
    oidcUser: null,
    isLoading: false
  });
};

export const setDefaultState = ({ configuration, loggerLevel, logger }) => {
  setLogger(loggerLevel, logger);
  return {
    oidcUser: undefined,
    userManager: authenticationService(configuration),
    isLoading: false,
    error: "",
    isFrozen: false
  };
};

export const login = props => async () => {
  props.setOidcState({
    ...props.oidcState,
    oidcUser: null,
    isLoading: true
  });
  oidcLog.info("Login requested");
  await authenticateUser(props.oidcState.userManager, props.location)();
};

export const logout = props => async () => {
  props.setOidcState({
    ...props.oidcState,
    oidcUser: null,
    isLoading: true,
    isFrozen: true
  });
  try {
    await logoutUser(props.oidcState.userManager);
    oidcLog.info("Logout successfull");
  } catch (error) {
    props.onError(error);
  }
};

export const onError = props => error => {
  oidcLog.error(`Error : ${error.message}`);
  props.setOidcState({
    ...props.oidcState,
    error: error.message,
    isLoading: false
  });
};

export const AuthenticationProviderComponentWithInit = WrappedComponent => {
  class ConstructedComponent extends React.Component {
    constructor(props) {
      super(props);
      setLogger(props.loggerLevel, props.logger);
      props.oidcState.userManager.events.addUserLoaded(props.onUserLoaded);
      props.oidcState.userManager.events.addSilentRenewError(props.onError);
      props.oidcState.userManager.events.addUserUnloaded(props.onUserUnloaded);
      props.oidcState.userManager.events.addUserSignedOut(props.onUserUnloaded);
    }

    shouldComponentUpdate(nextProps) {
      // Hack to avoid resfreshing user before logout
      oidcLog.info(
        `Protected component update : ${!nextProps.oidcState.isFrozen}`
      );
      return !nextProps.oidcState.isFrozen;
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  return ConstructedComponent;
};

export const withOidcState = withState(
  "oidcState",
  "setOidcState",
  setDefaultState
);

export const withOidcHandlers = withHandlers({
  onError,
  onUserLoaded,
  onUserUnloaded
});

export const withSecondOidcHandlers = withHandlers({
  login,
  logout
});

export const withOidcProps = withProps(({ oidcState }) => ({ ...oidcState }));

export const withLifeCycle = lifecycle({
  async componentDidMount() {
    if (this.props.configuration) {
      this.props.setOidcState({
        ...this.props.oidcState,
        isLoading: true
      });

      const user = await this.props.oidcState.userManager.getUser();
      this.props.setOidcState({
        ...this.props.oidcState,
        oidcUser: user
      });
    }
  },
  componentWillUnmount() {
    // unregister the event callbacks
    this.props.oidcState.userManager.events.removeUserLoaded(
      this.props.onUserLoaded
    );
    this.props.oidcState.userManager.events.removeSilentRenewError(
      this.props.onError
    );
    this.props.oidcState.userManager.events.removeUserUnloaded(
      this.props.onUserUnloaded
    );
    this.props.oidcState.userManager.events.removeUserSignedOut(
      this.props.onUserUnloaded
    );
  }
});

const AuthenticationProviderComponentHOC = compose(
  withRouter,
  withOidcState,
  withOidcHandlers,
  withSecondOidcHandlers,
  withLifeCycle,
  AuthenticationProviderComponentWithInit,
  withOidcProps
);

const AuthenticationProvider = AuthenticationProviderComponentHOC(
  AuthenticationProviderComponent
);

AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
const AuthenticationConsumer = AuthenticationContext.Consumer;

const withOidcUser = Component => props => (
  <AuthenticationConsumer>
    {({ oidcUser }) =>
      oidcUser ? (
        <Component {...props} oidcUser={oidcUser} />
      ) : (
        <Component {...props} oidcUser={null} />
      )
    }
  </AuthenticationConsumer>
);

const withOidc = Component => props => (
  <AuthenticationConsumer>
    {oidcProps => <Component {...props} oidcProps={oidcProps} />}
  </AuthenticationConsumer>
);

export {
  AuthenticationProvider,
  AuthenticationConsumer,
  withOidcUser,
  withOidc
};
