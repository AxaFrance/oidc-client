import { ComponentType } from 'react';

const LoadingTimeout: ComponentType<any> = () => (
  <div className="oidc-loading-timeout">
    <div className="oidc-loading-timeout__container">
      <h1 className="oidc-loading-timeout__title">Loading timeout</h1>
      <p className="oidc-loading-timeout__content">
        Authentication is taking longer than expected. Please try refreshing the page.
      </p>
    </div>
  </div>
);

export default LoadingTimeout;
