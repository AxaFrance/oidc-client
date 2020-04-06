import React from 'react';

const generateKey = () =>
  Math.random()
    .toString(36)
    .substr(2, 6);

// Exported only for test
export type WindowInternal = Window & {
  CustomEvent?: new <T>(typeArg: string, eventInitDict?: CustomEventInit<T>) => CustomEvent<T>;
  Event: typeof Event;
};

type IPrototype = {
  prototype: any;
};

type InitCustomEventParams<T = any> = {
  bubbles: boolean;
  cancelable: boolean;
  detail: T;
};

// IE Polyfill for CustomEvent
export const CreateEvent = (windowInternal: WindowInternal, documentInternal: Document) => (
  event: string,
  params: InitCustomEventParams
): CustomEvent => {
  if (typeof windowInternal.CustomEvent === 'function') {
    return new windowInternal.CustomEvent(event, params);
  }
  const paramsToFunction = params || { bubbles: false, cancelable: false, detail: undefined };
  const evt: CustomEvent = documentInternal.createEvent('CustomEvent');
  evt.initCustomEvent(
    event,
    paramsToFunction.bubbles,
    paramsToFunction.cancelable,
    paramsToFunction.detail
  );
  (evt as CustomEvent & IPrototype).prototype = windowInternal.Event.prototype;
  return evt;
};

type WindowHistoryState = typeof window.history.state;

export interface ReactOidcHistory {
  push: (url?: string | null, stateHistory?: WindowHistoryState) => void;
}

export const withRouter = (
  windowInternal: WindowInternal,
  CreateEventInternal: (event: string, params?: InitCustomEventParams) => CustomEvent,
  generateKeyInternal: typeof generateKey
) => (Component: React.ComponentType) => (props: any) => {
  const oidcHistory: ReactOidcHistory = {
    push: (url?: string | null, stateHistory?: WindowHistoryState): void => {
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
