import type { Fetch } from '@axa-fr/oidc-client';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOidcFetch } from './FetchToken';

const { getOrThrow, fetchWithTokens } = vi.hoisted(() => ({
  getOrThrow: vi.fn(),
  fetchWithTokens: vi.fn(),
}));

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: { getOrThrow },
}));

describe('useOidcFetch', () => {
  const originalFetch = vi.fn<Fetch>();
  const authenticatedFetch = vi.fn<Fetch>();
  const response = new Response('response');

  beforeEach(() => {
    vi.resetAllMocks();
    getOrThrow.mockReturnValue({ fetchWithTokens });
    fetchWithTokens.mockReturnValue(authenticatedFetch);
    authenticatedFetch.mockResolvedValue(response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('looks up the default configuration only when a request is made', async () => {
    const { result } = renderHook(() => useOidcFetch(originalFetch));

    expect(getOrThrow).not.toHaveBeenCalled();
    await expect(result.current.fetch('/resource')).resolves.toBe(response);
    expect(getOrThrow).toHaveBeenCalledExactlyOnceWith('default');
    expect(fetchWithTokens).toHaveBeenCalledExactlyOnceWith(originalFetch, false);
    expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith('/resource', undefined);
  });

  it('defaults to the browser fetch implementation', async () => {
    vi.stubGlobal('fetch', originalFetch);
    const { result } = renderHook(() => useOidcFetch());

    await result.current.fetch('/resource');

    expect(fetchWithTokens).toHaveBeenCalledExactlyOnceWith(originalFetch, false);
  });

  it.each([new URL('https://example.com/resource'), new Request('https://example.com/resource')])(
    'forwards request objects and options unchanged: %s',
    async input => {
      const init: RequestInit = { method: 'POST', headers: { 'X-Custom': 'value' }, body: 'body' };
      const { result } = renderHook(() => useOidcFetch(originalFetch, 'custom', true));

      await expect(result.current.fetch(input, init)).resolves.toBe(response);

      expect(getOrThrow).toHaveBeenCalledWith('custom');
      expect(fetchWithTokens).toHaveBeenCalledWith(originalFetch, true);
      expect(authenticatedFetch.mock.calls[0][0]).toBe(input);
      expect(authenticatedFetch.mock.calls[0][1]).toBe(init);
    },
  );

  it('uses the current client for each request rather than caching it', async () => {
    const nextFetchWithTokens = vi.fn().mockReturnValue(authenticatedFetch);
    const { result } = renderHook(() => useOidcFetch(originalFetch));
    await result.current.fetch('/first');

    getOrThrow.mockReturnValue({ fetchWithTokens: nextFetchWithTokens });
    await result.current.fetch('/second');

    expect(getOrThrow).toHaveBeenCalledTimes(2);
    expect(fetchWithTokens).toHaveBeenCalledTimes(1);
    expect(nextFetchWithTokens).toHaveBeenCalledExactlyOnceWith(originalFetch, false);
  });

  it('keeps the callback stable when its dependencies are unchanged', () => {
    const { result, rerender } = renderHook(() => useOidcFetch(originalFetch));
    const callback = result.current.fetch;

    rerender();

    expect(result.current.fetch).toBe(callback);
  });

  it.each([
    { fetch: vi.fn<Fetch>(), configurationName: 'default', isDpop: false },
    { fetch: originalFetch, configurationName: 'custom', isDpop: false },
    { fetch: originalFetch, configurationName: 'default', isDpop: true },
  ])('updates the callback when a dependency changes: %s', async nextProps => {
    const { result, rerender } = renderHook(
      ({ fetch, configurationName, isDpop }) => useOidcFetch(fetch, configurationName, isDpop),
      { initialProps: { fetch: originalFetch, configurationName: 'default', isDpop: false } },
    );
    const callback = result.current.fetch;

    rerender(nextProps);
    expect(result.current.fetch).not.toBe(callback);
    await result.current.fetch('/resource');

    expect(getOrThrow).toHaveBeenCalledWith(nextProps.configurationName);
    expect(fetchWithTokens).toHaveBeenCalledWith(nextProps.fetch, nextProps.isDpop);
  });

  it('rejects the request rather than throwing synchronously when configuration is missing', async () => {
    const error = new Error('Missing configuration');
    getOrThrow.mockImplementation(() => {
      throw error;
    });
    const { result } = renderHook(() => useOidcFetch(originalFetch));

    await expect(result.current.fetch('/resource')).rejects.toBe(error);
    expect(fetchWithTokens).not.toHaveBeenCalled();
  });

  it('preserves errors thrown while constructing the authenticated fetch', async () => {
    const error = new Error('Cannot construct fetch');
    fetchWithTokens.mockImplementation(() => {
      throw error;
    });
    const { result } = renderHook(() => useOidcFetch(originalFetch));

    await expect(result.current.fetch('/resource')).rejects.toBe(error);
  });

  it('preserves rejected fetch errors', async () => {
    const error = new Error('Network failure');
    authenticatedFetch.mockRejectedValue(error);
    const { result } = renderHook(() => useOidcFetch(originalFetch));

    await expect(result.current.fetch('/resource')).rejects.toBe(error);
  });
});
