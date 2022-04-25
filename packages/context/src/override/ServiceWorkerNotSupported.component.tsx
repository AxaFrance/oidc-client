import * as React from 'react';
import {FC, PropsWithChildren} from "react";
import {ComponentOidcProps} from "../oidc/core/default-component/ComponentTypes";
import {style} from "./style";

const ServiceWorkerNotSupported : FC<PropsWithChildren<ComponentOidcProps>> = ({children}) => (
  <><div className="oidc-serviceworker" style={style}>
    <div className="oidc-serviceworker__container">
      <h1 className="oidc-serviceworker__title">Unable to authenticate on this browser</h1>
      <p className="oidc-serviceworker__content">Your browser is not secure enough to make authentication work. Try updating your browser or use a newer browser.</p>
    </div>
  </div>
      <div>{children}</div>
      </>
);

export default ServiceWorkerNotSupported;
