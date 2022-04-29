import * as React from 'react';
import {ComponentType, PropsWithChildren} from "react";
import {style} from "./style";

const Loading :  ComponentType<any> = ({children, configurationName}) => (
  <>
      <span className="oidc-loading" style={style}>
    Loading for {configurationName}
  </span>
      </>
);

export default Loading;
