export const logError = (message, exception) => {
  if (console && console.error) {
    console.error(message, exception);
  }
};
