import * as React from 'react';
import {FC, PropsWithChildren} from "react";
import {ComponentOidcProps} from "./ComponentTypes";

const Loading : FC<PropsWithChildren<ComponentOidcProps>> = () => (
  <span className="oidc-loading">
    Loading
  </span>
);

export default Loading;
