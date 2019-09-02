import React from 'react';

const withServices = (WrappedComponent, Services) => props => {
  return <WrappedComponent {...props} {...Services} />;
};

export default withServices;
