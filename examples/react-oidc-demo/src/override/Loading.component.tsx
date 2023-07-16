import { ComponentType } from 'react';

import { style } from './style.js';

const Loading : ComponentType<any> = ({ configurationName }) => (
      <span className="oidc-loading" style={style}>
    Loading for {configurationName}
  </span>
);

export default Loading;
