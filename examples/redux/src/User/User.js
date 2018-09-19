import * as React from 'react';

export default props => {
  if (!props.isVisible) {
    return null;
  }

  return (<div>
    <p>Name: {props.name}</p>
    <p>Profile: {props.profile}</p>
    </div>);
};
