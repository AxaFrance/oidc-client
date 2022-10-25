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
  params: InitCustomEventParams,
): CustomEvent => {
  if (typeof windowInternal.CustomEvent === 'function') {
    return new windowInternal.CustomEvent(event, params);
  }
  const paramsToFunction = params || { bubbles: false, cancelable: false, detail: undefined };
  const evt: CustomEvent = documentInternal.createEvent('CustomEvent');
  evt.initCustomEvent(event, paramsToFunction.bubbles, paramsToFunction.cancelable, paramsToFunction.detail);
  (evt as CustomEvent & IPrototype).prototype = windowInternal.Event.prototype;
  return evt;
};

type WindowHistoryState = typeof window.history.state;

export interface ReactOidcHistory {
  replaceState: (url?: string | null, stateHistory?: WindowHistoryState) => void;
}

export type CustomHistory = {
  replaceState(url?: string | null, stateHistory?: WindowHistoryState): void;
}

const getHistory = (
  windowInternal: WindowInternal,
  CreateEventInternal: (event: string, params?: InitCustomEventParams) => CustomEvent,
  generateKeyInternal: typeof generateKey,
): CustomHistory => {
  return {
    replaceState: (url?: string | null, stateHistory?: WindowHistoryState): void => {
      const key = generateKeyInternal();
      const state = stateHistory || windowInternal.history.state;
      windowInternal.history.replaceState({ key, state }, null, url);
      windowInternal.dispatchEvent(CreateEventInternal('popstate'));
    },
  };
};

export const getCustomHistory = () => getHistory(window, CreateEvent(window, document), generateKey);
