import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: (...args: unknown[]) => mockGet(...args),
    eventNames: {
      token_acquired: 'token_acquired',
      token_renewed: 'token_renewed',
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      syncTokensAsync_error: 'syncTokensAsync_error',
    },
  },
}));

import { __resetOidcClientRegistryForTests } from './oidcClientRegistry';
import { useOidc, useOidcAccessToken, useOidcIdToken } from './ReactOidc';

describe('React OIDC hooks without an OidcProvider', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetOidcClientRegistryForTests();
    mockGet.mockReset();
    mockGet.mockImplementation(() => {
      throw new Error('OIDC library does seem initialized.');
    });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('useOidc returns unauthenticated defaults and stable no-op callbacks', () => {
    const { result } = renderHook(() => useOidc());

    expect(result.current.isAuthenticated).toBe(false);
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.renewTokens).toBe('function');
  });

  it('useOidc.login / logout / renewTokens do not throw without a provider', async () => {
    const { result } = renderHook(() => useOidc());

    await expect(result.current.login()).resolves.toBeUndefined();
    await expect(result.current.logout()).resolves.toBeUndefined();
    await expect(result.current.renewTokens()).resolves.toEqual({
      accessToken: null,
      accessTokenPayload: null,
      idToken: null,
      idTokenPayload: null,
    });
  });

  it('useOidcAccessToken returns null tokens without a provider', () => {
    const { result } = renderHook(() => useOidcAccessToken());

    expect(result.current.accessToken).toBeNull();
    expect(result.current.accessTokenPayload).toBeNull();
    expect(result.current.generateDemonstrationOfProofOfPossessionAsync).toBeNull();
  });

  it('useOidcIdToken returns null tokens without a provider', () => {
    const { result } = renderHook(() => useOidcIdToken());

    expect(result.current.idToken).toBeNull();
    expect(result.current.idTokenPayload).toBeNull();
  });

  it('emits a development warning at most once per configuration name', () => {
    renderHook(() => useOidc('storybook-config'));
    renderHook(() => useOidc('storybook-config'));
    renderHook(() => useOidcAccessToken('storybook-config'));

    const warningsForConfig = warnSpy.mock.calls.filter(call =>
      String(call[0]).includes('storybook-config'),
    );
    expect(warningsForConfig.length).toBe(1);
  });

  it('does not throw when OidcClient.get throws synchronously', () => {
    expect(() => renderHook(() => useOidc())).not.toThrow();
    expect(() => renderHook(() => useOidcAccessToken())).not.toThrow();
    expect(() => renderHook(() => useOidcIdToken())).not.toThrow();
  });
});
