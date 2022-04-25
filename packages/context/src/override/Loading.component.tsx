import * as React from 'react';
import {FC, PropsWithChildren} from "react";
import {ComponentOidcProps} from "../oidc/core/default-component/ComponentTypes";
import {style} from "./style";

const Loading : FC<PropsWithChildren<ComponentOidcProps>> = ({children}) => (
  <>
      <span className="oidc-loading" style={style}>
    Loading
  </span>
      <div>
      {children}
      </div>
      </>
);

export default Loading;
