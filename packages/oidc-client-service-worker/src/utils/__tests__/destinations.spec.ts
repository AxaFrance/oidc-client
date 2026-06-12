import { describe, expect, it } from 'vitest';

import { shouldBypassDestination } from '../destinations';

describe('shouldBypassDestination', () => {
  const bypassedDestinations = ['image', 'font', 'media', 'document', 'iframe', 'script'];

  describe('non-navigate requests with bypassed destinations', () => {
    it.each(bypassedDestinations)(
      'should bypass "%s" destination when mode is not navigate',
      (destination) => {
        expect(shouldBypassDestination(destination, 'cors')).toBe(true);
        expect(shouldBypassDestination(destination, 'same-origin')).toBe(true);
        expect(shouldBypassDestination(destination, 'no-cors')).toBe(true);
      },
    );
  });

  describe('navigate requests should NOT be bypassed (issue #1683)', () => {
    it('should not bypass "document" destination when mode is "navigate"', () => {
      expect(shouldBypassDestination('document', 'navigate')).toBe(false);
    });

    it.each(bypassedDestinations)(
      'should not bypass "%s" destination when mode is "navigate"',
      (destination) => {
        expect(shouldBypassDestination(destination, 'navigate')).toBe(false);
      },
    );
  });

  describe('non-bypassed destinations', () => {
    it('should not bypass empty destination', () => {
      expect(shouldBypassDestination('', 'cors')).toBe(false);
    });

    it('should not bypass "worker" destination', () => {
      expect(shouldBypassDestination('worker', 'cors')).toBe(false);
    });

    it('should not bypass unknown destinations', () => {
      expect(shouldBypassDestination('audio', 'cors')).toBe(false);
      expect(shouldBypassDestination('fetch', 'cors')).toBe(false);
    });
  });
});
