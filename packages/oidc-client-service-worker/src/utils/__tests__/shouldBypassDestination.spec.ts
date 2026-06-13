import { describe, expect, it } from 'vitest';

import { shouldBypassDestination } from '../shouldBypassDestination';

describe('shouldBypassDestination', () => {
  it.each(['image', 'font', 'media', 'document', 'iframe', 'script'])(
    'should bypass %s destination for non-navigate requests',
    destination => {
      expect(shouldBypassDestination(destination, 'cors')).toBe(true);
      expect(shouldBypassDestination(destination, 'same-origin')).toBe(true);
      expect(shouldBypassDestination(destination, 'no-cors')).toBe(true);
    },
  );

  it.each(['image', 'font', 'media', 'document', 'iframe', 'script'])(
    'should NOT bypass %s destination for navigate requests',
    destination => {
      expect(shouldBypassDestination(destination, 'navigate')).toBe(false);
    },
  );

  it('should not bypass non-listed destinations', () => {
    expect(shouldBypassDestination('', 'cors')).toBe(false);
    expect(shouldBypassDestination('worker', 'same-origin')).toBe(false);
    expect(shouldBypassDestination('audio', 'no-cors')).toBe(false);
  });

  it('should not bypass empty destination with navigate mode', () => {
    expect(shouldBypassDestination('', 'navigate')).toBe(false);
  });
});
