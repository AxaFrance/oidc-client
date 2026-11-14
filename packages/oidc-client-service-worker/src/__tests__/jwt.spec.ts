import { describe, expect, it, vi } from 'vitest';

import {
  defaultDemonstratingProofOfPossessionConfiguration,
  generateJwkAsync,
  generateJwtDemonstratingProofOfPossessionAsync,
} from '../jwt';

const decodePayload = (jwt: string) => {
  const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload));
};

describe('generateJwtDemonstratingProofOfPossessionAsync', () => {
  it.each([
    ['https://api.example.com/resource?limit=2#section', 'https://api.example.com/resource'],
    ['/resource?limit=2#section', 'https://api.example.com/resource'],
  ])('excludes query and fragment from the worker DPoP target %s', async (url, expected) => {
    const environment = {
      crypto: globalThis.crypto,
      location: { href: 'https://api.example.com/' },
    };
    const jwk = await generateJwkAsync(environment)(
      defaultDemonstratingProofOfPossessionConfiguration.generateKeyAlgorithm,
    );
    const jwt = await generateJwtDemonstratingProofOfPossessionAsync(environment)(
      defaultDemonstratingProofOfPossessionConfiguration,
    )(jwk, 'GET', url);
    expect(decodePayload(jwt).htu).toBe(expected);
  });

  it('uses a cryptographically secure UUID for the DPoP jti in the service worker', async () => {
    const uuid = '123e4567-e89b-42d3-a456-426614174000';
    const randomUUID = vi.fn(() => uuid);
    const webCrypto = {
      subtle: globalThis.crypto.subtle,
      randomUUID,
    };
    const jwk = await generateJwkAsync(globalThis)(
      defaultDemonstratingProofOfPossessionConfiguration.generateKeyAlgorithm,
    );

    const jwt = await generateJwtDemonstratingProofOfPossessionAsync({ crypto: webCrypto })(
      defaultDemonstratingProofOfPossessionConfiguration,
    )(jwk, 'GET', 'https://api.example.com/resource');

    expect(randomUUID).toHaveBeenCalledOnce();
    expect(decodePayload(jwt).jti).toBe(btoa(uuid));
  });
});
