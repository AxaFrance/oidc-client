const bypassedDestinations = ['image', 'font', 'media', 'document', 'iframe', 'script'];

/**
 * Determines whether a fetch event should be bypassed (not intercepted by the service worker).
 * Navigation requests (mode === 'navigate') are never bypassed, even when their destination
 * is in the bypassed list, so that access tokens can be injected into new-tab navigations.
 */
export const shouldBypassDestination = (destination: string, mode: string): boolean => {
  return bypassedDestinations.includes(destination) && mode !== 'navigate';
};
