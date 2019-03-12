import { withRouter } from "react-router-dom";
import { compose, withProps, lifecycle, withHandlers, pure } from "recompose";

import { getUserManager, oidcLog } from "../Services";
import CallbackComponent from "./Callback.component";

export const onRedirectSuccess = ({ history }) => user => {
  oidcLog.info("Successfull Callback");
  if (user.state.url) {
    history.push(user.state.url);
  } else {
    oidcLog.warn("no location in state");
  }
};

export const onRedirectError = ({ history }) => error => {
  const { message } = error;
  oidcLog.error(
    `There was an error handling the token callback: ${error.message}`
  );
  history.push(`/authentication/not-authenticated?message=${message}`);
};

export const componentDidMountFunction = async props => {
  try {
    const user = await props.userManager.signinRedirectCallback();
    props.onRedirectSuccess(user);
  } catch (error) {
    props.onRedirectError(error);
  }
};

const withLifeCycle = lifecycle({
  async componentDidMount() {
    componentDidMountFunction(this.props);
  }
});

const wrapUserManager = () => ({ userManager: getUserManager() });

export const withCallbackHandlers = withHandlers({
  onRedirectSuccess,
  onRedirectError
});

const enhance = compose(
  withRouter,
  withCallbackHandlers,
  withProps(wrapUserManager),
  withLifeCycle
);

export default pure(enhance(CallbackComponent));
