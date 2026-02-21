import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OidcUserStatus, useOidcUser } from './User';

const mockSubscribeEvents = vi.fn().mockReturnValue('subscription-id');
const mockRemoveEventSubscription = vi.fn();
const mockUserInfo = vi.fn();
const mockUserInfoAsync = vi.fn();

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(() => ({
      tokens: { access_token: 'test-token' },
      userInfo: mockUserInfo,
      userInfoAsync: mockUserInfoAsync,
      subscribeEvents: mockSubscribeEvents,
      removeEventSubscription: mockRemoveEventSubscription,
    })),
    eventNames: {
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
    },
  },
}));

describe('useOidcUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeEvents.mockReturnValue('subscription-id');
    mockRemoveEventSubscription.mockReset();
  });

  it('should load user information and update status correctly on reload', async () => {
    const userInfo = { sub: 'user1', name: 'Test User' };
    // Initial state: no cached user
    mockUserInfo.mockReturnValue(null);
    // userInfoAsync resolves with user info
    mockUserInfoAsync.mockResolvedValue(userInfo);

    const { result } = renderHook(() => useOidcUser());

    // Initially unauthenticated since userInfo returns null
    await waitFor(() => {
      expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Unauthenticated);
    });

    // Simulate the user being authenticated (tokens present)
    mockUserInfo.mockReturnValue(userInfo);

    // Trigger reload
    act(() => {
      result.current.reloadOidcUser();
    });

    // After reload, should eventually show loaded state (not stay stuck at loading)
    await waitFor(() => {
      expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Loaded);
    });

    expect(result.current.oidcUser).toEqual(userInfo);
  });

  it('should not get stuck at Loading state after reloadOidcUser is called', async () => {
    const initialUser = { sub: 'user1', name: 'Initial User' };
    const reloadedUser = { sub: 'user1', name: 'Reloaded User' };

    // User is already authenticated
    mockUserInfo.mockReturnValue(initialUser);
    // userInfoAsync resolves with new data
    mockUserInfoAsync.mockResolvedValue(reloadedUser);

    const { result } = renderHook(() => useOidcUser());

    // Initial state: user loaded from cache
    expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Loaded);

    // Trigger reload
    act(() => {
      result.current.reloadOidcUser();
    });

    // Should complete the reload and show the reloaded user (not stuck at Loading)
    await waitFor(() => {
      expect(result.current.oidcUser).toEqual(reloadedUser);
    });

    expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Loaded);
  });
});
