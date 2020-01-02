import React from 'react';

const generateKey = () =>
  Math.random()
    .toString(36)
    .substr(2, 6);

// IE Polyfill for CustomEvent
export const CreateEvent = (windowInternal, documentInternal) => (event, params) => {
  if (typeof windowInternal.CustomEvent === 'function') {
    return new windowInternal.CustomEvent(event, params);
  }
  const paramsToFunction = params || { bubbles: false, cancelable: false, detail: undefined };
  const evt = documentInternal.createEvent('CustomEvent');
  evt.initCustomEvent(
    event,
    paramsToFunction.bubbles,
    paramsToFunction.cancelable,
    paramsToFunction.detail
  );
  evt.prototype = windowInternal.Event.prototype;
  return evt;
};

export const withRouter = (
  windowInternal,
  CreateEventInternal,
  generateKeyInternal
) => Component => props => {
  const oidcHistory = {
    push: (url, stateHistory) => {
      const key = generateKeyInternal();
      const state = stateHistory || windowInternal.history.state;
      windowInternal.history.pushState({ key, state }, null, url);
      windowInternal.dispatchEvent(CreateEventInternal('popstate'));
    },
  };

  const enhanceProps = {
    history: oidcHistory,
    location: windowInternal.location,
    ...props,
  };
  return <Component {...enhanceProps} />;
};

export default withRouter(window, CreateEvent(window, document), generateKey);
