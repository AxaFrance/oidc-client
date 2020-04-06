import React, { ComponentType } from 'react';

const withServices = (WrappedComponent: ComponentType, Services: any) => (props: any) => {
  return <WrappedComponent {...props} {...Services} />;
};

export default withServices;
