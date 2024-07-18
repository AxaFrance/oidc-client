const timer = (function () {
  // In NextJS with SSR (Server Side Rendering) during rending in Node JS, the window object is undefined,
  // the global object is used instead as it is the closest approximation of a browsers window object.
  const bindContext = typeof window === 'undefined' ? global : window;
  return {
    setTimeout: setTimeout.bind(bindContext),
    clearTimeout: clearTimeout.bind(bindContext),
    setInterval: setInterval.bind(bindContext),
    clearInterval: clearInterval.bind(bindContext),
  };
})();

export default timer;
