import { authenticationService, configurationPropTypes, OidcRoutes, UserStoreType } from '@axa-fr/react-oidc-core';
import PropTypes from 'prop-types';
import React, { ComponentType, FC, PropsWithChildren } from 'react';
import { OidcProvider } from 'redux-oidc';
import AuthenticationCallback from './AuthenticationCallback';

const propTypes = {
  notAuthenticated: PropTypes.elementType,
  notAuthorized: PropTypes.elementType,
  callbackComponentOverride: PropTypes.elementType,
  sessionLostComponent: PropTypes.elementType,
  // eslint-disable-next-line react/require-default-props
  configuration: configurationPropTypes,
  store: PropTypes.object.isRequired,
  children: PropTypes.node,
  UserStore: PropTypes.func,
};

const defaultPropsObject: Partial<OidcBaseProps> = {
  notAuthenticated: null,
  notAuthorized: null,
  callbackComponentOverride: null,
  sessionLostComponent: null,
  children: null,
  UserStore: null,
};

const withComponentOverrideProps = (Component: ComponentType, customProps: any) => (props: any) => (
  <Component callbackComponentOverride={customProps} {...props} />
);

export const OidcBaseInternal = (props: any) => {
  const {
    children,
    store,
    callbackComponentOverride,
    configuration,
    notAuthenticated,
    notAuthorized,
    sessionLostComponent,
    UserStore,
    authenticationServiceInternal,
  } = props;

  const getUserManager = () => authenticationServiceInternal(configuration, UserStore);
  return (
    <OidcProvider store={store} userManager={getUserManager()}>
      <OidcRoutes
        configuration={configuration}
        notAuthenticated={notAuthenticated}
        notAuthorized={notAuthorized}
        sessionLost={sessionLostComponent}
        callbackComponent={withComponentOverrideProps(AuthenticationCallback, callbackComponentOverride)}
      >
        {children}
      </OidcRoutes>
    </OidcProvider>
  );
};

OidcBaseInternal.propTypes = {
  ...propTypes,
  authenticationServiceInternal: PropTypes.func.isRequired,
};

type OidcBaseProps = PropsWithChildren<{
  notAuthenticated?: ComponentType | null;
  notAuthorized?: ComponentType | null;
  callbackComponentOverride?: ComponentType | null;
  sessionLostComponent?: ComponentType | null;
  configuration: any;
  store: any;
  UserStore: UserStoreType;
}>;

const OidcBase: FC<OidcBaseProps> = props => <OidcBaseInternal authenticationServiceInternal={authenticationService} {...props} />;

// @ts-ignore
OidcBase.propTypes = propTypes;
OidcBase.defaultProps = defaultPropsObject;

export default OidcBase;
