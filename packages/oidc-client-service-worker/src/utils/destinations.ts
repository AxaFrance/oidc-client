const bypassedDestinations = ['image', 'font', 'media', 'document', 'iframe', 'script'];

/**
 * Determines whether a fetch request should bypass the service worker's token injection.
 * Navigation requests (mode === "navigate") are never bypassed, even if their destination
 * is in the bypassed list, so that the access token can be injected for new-tab navigations.
 */
export const shouldBypassDestination = (destination: string, mode: string): boolean => {
  return bypassedDestinations.includes(destination) && mode !== 'navigate';
};
