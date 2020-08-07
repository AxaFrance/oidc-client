import React from 'react';

const SimpleComponent = ({ type }) => {
  const [state, setState] = React.useState('init');
  const handleChange = React.useCallback(e => {
    setState(e.target.value);
  }, [setState]);
  return (
    <>
      <h1>Simple Component</h1>
      <p>Protected {type}</p>
      <input value={state} onChange={handleChange} />
    </>
  );
};

// adding the oidc user in the props
export default SimpleComponent;
