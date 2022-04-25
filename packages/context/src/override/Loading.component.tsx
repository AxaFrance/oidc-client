import * as React from 'react';
import {PropsWithChildren} from "react";
import {style} from "./style";

const Loading :  PropsWithChildren<any> = ({children}) => (
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
