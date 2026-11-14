import { describe, expect, it } from 'vitest';

import {
  getContextResource,
  getResourceConfiguration,
  getResourceContextName,
  isResourceOriginManaged,
  isResourceUrlAllowed,
  validateResourceIdentifier,
} from '../resource';

describe('RFC 8707 resource configuration', () => {
  it('recognizes managed origins outside mapped paths without permitting those paths', () => {
    const configuration = {
      resource: 'urn:orders',
      allowedUrlPrefixes: ['https://api.example.com/orders'],
    };
    expect(isResourceOriginManaged([configuration], 'https://api.example.com/v2/items')).toBe(true);
    expect(isResourceUrlAllowed(configuration, 'https://api.example.com/v2/items')).toBe(false);
    expect(
      isResourceOriginManaged([configuration], 'https://api.example.com.evil.test/orders'),
    ).toBe(false);
    expect(() =>
      isResourceOriginManaged(
        [{ ...configuration, allowedUrlPrefixes: ['https://api.example.com/orders?query'] }],
        'https://api.example.com/orders',
      ),
    ).toThrow('query');
  });
  const configuration = {
    resource: 'urn:example:api',
    allowedUrlPrefixes: ['https://api.example.com/orders'],
  };

  it.each(['urn:example:api', 'https://api.example.com/?tenant=one'])(
    'accepts the absolute identifier %s',
    resource => {
      expect(() => validateResourceIdentifier(resource)).not.toThrow();
    },
  );

  it.each([
    '',
    '/api',
    'https://api.example.com/#fragment',
    'urn:example:api#',
    ' https://api.example.com',
  ])('rejects the invalid identifier %s', resource => {
    expect(() => validateResourceIdentifier(resource)).toThrow();
  });

  it('requires an explicit, unique registration and API mappings', () => {
    expect(getResourceConfiguration([configuration], configuration.resource)).toBe(configuration);
    expect(() => getResourceConfiguration([], configuration.resource)).toThrow();
    expect(() =>
      getResourceConfiguration([configuration, configuration], configuration.resource),
    ).toThrow();
    expect(() =>
      getResourceConfiguration(
        [{ ...configuration, allowedUrlPrefixes: [] }],
        configuration.resource,
      ),
    ).toThrow();
  });

  it.each(['https://api.example.com/orders', 'https://api.example.com/orders/42?view=full'])(
    'permits the mapped destination %s',
    url => {
      expect(isResourceUrlAllowed(configuration, url)).toBe(true);
    },
  );

  it.each([
    'https://api.example.com.evil.test/orders',
    'https://api.example.com/orders-other',
    'https://other.example.com/orders',
    'https://api.example.com:444/orders',
  ])('rejects the unmapped destination %s', url => {
    expect(isResourceUrlAllowed(configuration, url)).toBe(false);
  });

  it.each([
    'https://user:password@api.example.com/orders',
    'https://api.example.com/orders%2fother',
    'file:///orders',
    'https://api.example.com/orders#fragment',
  ])('rejects the unsafe destination %s', url => {
    expect(() => isResourceUrlAllowed(configuration, url)).toThrow();
  });

  it('round-trips resource context markers without collisions', () => {
    const resource = 'urn:example:a&b=%25';
    const name = getResourceContextName('default#tabId=one', resource);
    expect(getContextResource(name)).toBe(resource);
    expect(getContextResource('default')).toBeUndefined();
    expect(name).not.toBe(getResourceContextName('default#tabId=one', 'urn:example:a'));
  });
});
