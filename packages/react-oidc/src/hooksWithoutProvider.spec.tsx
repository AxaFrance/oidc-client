import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOidc, useOidcAccessToken, useOidcIdToken } from './ReactOidc';
import { OidcUserStatus, useOidcUser } from './User';
import { resetWarnedConfigurations } from './warnMissingConfiguration';

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(() => null),
    getOrThrow: vi.fn(() => {
      throw new Error('OIDC library does seem initialized.');
    }),
    eventNames: {
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      token_acquired: 'token_acquired',
      token_renewed: 'token_renewed',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      syncTokensAsync_error: 'syncTokensAsync_error',
    },
  },
}));

describe('hooks used outside <OidcProvider> (issue #1679)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetWarnedConfigurations();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('useOidc', () => {
    it('does not throw and returns safe defaults', () => {
      const { result } = renderHook(() => useOidc());
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.renewTokens).toBe('function');
    });

    it('login / logout / renewTokens resolve without throwing', async () => {
      const { result } = renderHook(() => useOidc());
      await expect(result.current.login()).resolves.toBeUndefined();
      await expect(result.current.logout()).resolves.toBeUndefined();
      await expect(result.current.renewTokens()).resolves.toMatchObject({
        accessToken: null,
        idToken: null,
      });
    });

    it('warns once per configuration name', () => {
      renderHook(() => useOidc('cfg-a'));
      renderHook(() => useOidc('cfg-a'));
      renderHook(() => useOidc('cfg-b'));
      const messagesForA = warnSpy.mock.calls.filter(args => String(args[0]).includes('"cfg-a"'));
      const messagesForB = warnSpy.mock.calls.filter(args => String(args[0]).includes('"cfg-b"'));
      expect(messagesForA.length).toBe(1);
      expect(messagesForB.length).toBe(1);
    });
  });

  describe('useOidcAccessToken', () => {
    it('returns the default access-token state', () => {
      const { result } = renderHook(() => useOidcAccessToken());
      expect(result.current).toEqual({ accessToken: null, accessTokenPayload: null });
    });
  });

  describe('useOidcIdToken', () => {
    it('returns the default id-token state', () => {
      const { result } = renderHook(() => useOidcIdToken());
      expect(result.current).toEqual({ idToken: null, idTokenPayload: null });
    });
  });

  describe('useOidcUser', () => {
    it('returns the default user state without throwing', () => {
      const { result } = renderHook(() => useOidcUser());
      expect(result.current.oidcUser).toBeNull();
      expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Unauthenticated);
      expect(typeof result.current.reloadOidcUser).toBe('function');
    });
  });
});
