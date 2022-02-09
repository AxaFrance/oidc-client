import React, { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Callback } from '../default-component/index';
import { getPath } from './route-utils';
import CallbackComponent from '../default-component/Callback.component';

const propTypes = {
  callbackComponent: PropTypes.elementType,
  redirect_uri: PropTypes.string.isRequired,
  children: PropTypes.node,
};

const defaultProps: Partial<OidcRoutesProps> = {

};

type OidcRoutesProps = {
  callbackSuccessComponent?: ComponentType;
  callbackErrorComponent?: ComponentType;
  configurationName:string;
  redirect_uri: string;
};

const OidcRoutes: FC<PropsWithChildren<OidcRoutesProps>> = ({
  callbackErrorComponent,
  callbackSuccessComponent, redirect_uri,
  children, configurationName
}) => {
  const [path, setPath] = useState(window.location.pathname);

  const setNewPath = () => setPath(window.location.pathname);
  useEffect(() => {
    setNewPath();
    window.addEventListener('popstate', setNewPath, false);
    return () => window.removeEventListener('popstate', setNewPath, false);
  });


  const callbackPath = getPath(redirect_uri);

  switch (path) {
    case callbackPath:
      return <CallbackComponent callBackError={callbackErrorComponent} callBackSuccess={callbackSuccessComponent} configurationName={configurationName} />;
    default:
      return <>{children}</>;
  }
};

// @ts-ignore
OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default React.memo(OidcRoutes);
