import React from "react";
import { UserManager } from "oidc-client";
import { pure } from "recompose";
import { oidcLog } from "../Services";

export class SilentCallback extends React.Component {
  constructor(props) {
    new UserManager({}).signinSilentCallback();
    oidcLog.info("callback silent signin successfull");
    super(props);
  }

  render = () => <div />;
}

export default pure(SilentCallback);
