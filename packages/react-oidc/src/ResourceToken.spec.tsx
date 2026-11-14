import type { Fetch, ResourceAccessToken } from '@axa-fr/oidc-client';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOidcAccessTokenForResource, useOidcFetchForResource } from './ResourceToken';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getOrThrow: vi.fn(),
  fetchForResource: vi.fn(),
  getAccessTokenForResource: vi.fn(),
  getAccessTokenForResourceAsync: vi.fn(),
  clearResourceTokensAsync: vi.fn(),
  subscribeEvents: vi.fn(),
  removeEventSubscription: vi.fn(),
}));

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: mocks.get,
    getOrThrow: mocks.getOrThrow,
    eventNames: {
      resource_token_error: 'resource_token_error',
      resource_token_acquired: 'resource_token_acquired',
      resource_token_cleared: 'resource_token_cleared',
      logout_from_same_tab: 'logout_from_same_tab',
      logout_from_another_tab: 'logout_from_another_tab',
    },
  },
}));

const token: ResourceAccessToken = {
  resource: 'urn:api:a',
  issuer: 'https://issuer.example.com',
  clientId: 'client',
  configurationName: 'default',
  accessToken: 'api-a-token',
  expiresAt: Date.now() / 1000 + 100,
};

beforeEach(() => {
  vi.resetAllMocks();
  const oidc = {
    fetchForResource: mocks.fetchForResource,
    getAccessTokenForResource: mocks.getAccessTokenForResource,
    getAccessTokenForResourceAsync: mocks.getAccessTokenForResourceAsync,
    clearResourceTokensAsync: mocks.clearResourceTokensAsync,
    subscribeEvents: mocks.subscribeEvents,
    removeEventSubscription: mocks.removeEventSubscription,
  };
  mocks.get.mockReturnValue(oidc);
  mocks.getOrThrow.mockReturnValue(oidc);
  mocks.getAccessTokenForResource.mockReturnValue(null);
  mocks.getAccessTokenForResourceAsync.mockResolvedValue(token);
  mocks.subscribeEvents.mockReturnValue('subscription');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOidcFetchForResource', () => {
  it('resolves the current named client only when executing each request', async () => {
    const original = vi.fn<Fetch>();
    const response = new Response();
    const authenticated = vi.fn<Fetch>().mockResolvedValue(response);
    mocks.fetchForResource.mockReturnValue(authenticated);
    const { result, rerender } = renderHook(() =>
      useOidcFetchForResource('urn:api:a', {
        fetch: original,
        configurationName: 'custom',
        demonstratingProofOfPossession: true,
      }),
    );
    expect(mocks.getOrThrow).not.toHaveBeenCalled();
    const callback = result.current.fetch;
    rerender();
    expect(result.current.fetch).toBe(callback);
    expect(await callback('https://api.example.com/a')).toBe(response);
    expect(mocks.fetchForResource).toHaveBeenCalledWith('urn:api:a', original, {
      demonstratingProofOfPossession: true,
    });
    await callback('https://api.example.com/a/second');
    expect(mocks.getOrThrow).toHaveBeenCalledTimes(2);
    expect(mocks.getOrThrow).toHaveBeenCalledWith('custom');
  });

  it('updates resource selection when dependencies change', async () => {
    const original = vi.fn<Fetch>();
    mocks.fetchForResource.mockReturnValue(vi.fn<Fetch>().mockResolvedValue(new Response()));
    const { result, rerender } = renderHook(
      ({ resource }) => useOidcFetchForResource(resource, { fetch: original }),
      { initialProps: { resource: 'urn:api:a' } },
    );
    const previous = result.current.fetch;
    rerender({ resource: 'urn:api:b' });
    expect(result.current.fetch).not.toBe(previous);
    await result.current.fetch('https://api.example.com/b');
    expect(mocks.fetchForResource).toHaveBeenCalledWith('urn:api:b', original, {
      demonstratingProofOfPossession: false,
    });
  });

  it('rejects missing configurations asynchronously rather than throwing during render', async () => {
    const error = new Error('Missing configuration');
    mocks.getOrThrow.mockImplementation(() => {
      throw error;
    });
    const { result } = renderHook(() => useOidcFetchForResource('urn:api:a'));
    await expect(result.current.fetch('https://api.example.com/a')).rejects.toBe(error);
    expect(mocks.fetchForResource).not.toHaveBeenCalled();
  });
});

describe('useOidcAccessTokenForResource', () => {
  it('does not initiate authorization while rendering and exposes explicit acquisition', async () => {
    const { result } = renderHook(() => useOidcAccessTokenForResource('urn:api:a'));
    expect(mocks.getAccessTokenForResourceAsync).not.toHaveBeenCalled();
    expect(result.current.token).toBeNull();
    await act(async () => {
      await result.current.getAccessTokenAsync({ forceRenew: true });
    });
    expect(result.current.token).toEqual(token);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mocks.getAccessTokenForResourceAsync).toHaveBeenCalledWith('urn:api:a', {
      forceRenew: true,
    });
  });

  it('exposes provider errors without swallowing the rejected promise', async () => {
    const error = new Error('consent_required');
    mocks.getAccessTokenForResourceAsync.mockRejectedValue(error);
    const { result } = renderHook(() => useOidcAccessTokenForResource('urn:api:a'));
    await act(async () => {
      await expect(result.current.getAccessTokenAsync()).rejects.toBe(error);
    });
    expect(result.current.error).toBe(error);
    expect(result.current.isLoading).toBe(false);
  });

  it('filters resource events and removes the subscription on unmount', () => {
    const { result, unmount } = renderHook(() => useOidcAccessTokenForResource('urn:api:a'));
    const listener = mocks.subscribeEvents.mock.calls[0][0];
    mocks.getAccessTokenForResource.mockReturnValue(token);
    act(() => listener('resource_token_acquired', { resource: 'urn:api:b' }));
    expect(result.current.token).toBeNull();
    act(() => listener('resource_token_acquired', { resource: 'urn:api:a' }));
    expect(result.current.token).toEqual(token);
    unmount();
    expect(mocks.removeEventSubscription).toHaveBeenCalledWith('subscription');
  });

  it('never exposes the previous resource token after resource selection changes', async () => {
    const { result, rerender } = renderHook(
      ({ resource }) => useOidcAccessTokenForResource(resource),
      { initialProps: { resource: 'urn:api:a' } },
    );
    await act(async () => {
      await result.current.getAccessTokenAsync();
    });
    expect(result.current.token).toEqual(token);
    rerender({ resource: 'urn:api:b' });
    expect(result.current.token).toBeNull();
  });

  it('delegates clearing to the selected resource and configuration', async () => {
    const { result } = renderHook(() => useOidcAccessTokenForResource('urn:api:a', 'custom'));
    await act(async () => {
      await result.current.clearResourceTokensAsync();
    });
    expect(mocks.getOrThrow).toHaveBeenCalledWith('custom');
    expect(mocks.clearResourceTokensAsync).toHaveBeenCalledWith('urn:api:a');
  });

  it('observes automatic renewal errors for only its own resource and resets them on acquisition', () => {
    const { result } = renderHook(() => useOidcAccessTokenForResource('urn:api:a'));
    const listener = mocks.subscribeEvents.mock.calls[0][0];
    const error = new Error('invalid_target');
    act(() => listener('resource_token_error', { resource: 'urn:api:b', error }));
    expect(result.current.error).toBeNull();
    act(() => listener('resource_token_error', { resource: 'urn:api:a', error }));
    expect(result.current.error).toBe(error);
    mocks.getAccessTokenForResource.mockReturnValue(token);
    act(() => listener('resource_token_acquired', { resource: 'urn:api:a' }));
    expect(result.current.error).toBeNull();
    expect(result.current.token).toEqual(token);
  });

  it('does not expose a late token when the selected resource changes during acquisition', async () => {
    let complete: (value: ResourceAccessToken) => void;
    mocks.getAccessTokenForResourceAsync.mockImplementation(
      () =>
        new Promise<ResourceAccessToken>(resolve => {
          complete = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ resource }) => useOidcAccessTokenForResource(resource),
      { initialProps: { resource: 'urn:api:a' } },
    );
    let pending: Promise<ResourceAccessToken>;
    act(() => {
      pending = result.current.getAccessTokenAsync();
    });
    rerender({ resource: 'urn:api:b' });
    await act(async () => {
      complete(token);
      await pending;
    });
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
