import { describe, expect, it } from 'vitest';

import { Oidc } from './oidc.js';
import { OidcClient } from './oidcClient.js';

describe('OidcClient.get (issue #1679)', () => {
  it('returns null when no configuration has been initialized', () => {
    expect(OidcClient.get('unknown-configuration-1679')).toBeNull();
  });

  it('does not throw when no configuration has been initialized', () => {
    expect(() => OidcClient.get('another-unknown-configuration-1679')).not.toThrow();
  });
});

describe('OidcClient.getOrThrow (issue #1679)', () => {
  it('throws an explicit error when configuration has not been initialized', () => {
    expect(() => OidcClient.getOrThrow('missing-configuration-1679')).toThrow(
      /OIDC library does seem initialized/,
    );
  });
});

describe('Oidc.get (issue #1679)', () => {
  it('returns null when no configuration has been initialized', () => {
    expect(Oidc.get('unknown-oidc-1679')).toBeNull();
  });

  it('Oidc.getOrThrow throws when configuration has not been initialized', () => {
    expect(() => Oidc.getOrThrow('missing-oidc-1679')).toThrow(
      /OIDC library does seem initialized/,
    );
  });
});
