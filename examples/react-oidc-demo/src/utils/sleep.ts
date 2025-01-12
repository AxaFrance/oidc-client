export const sleepAsync = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};
