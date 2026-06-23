import { render, renderHook, screen } from '@testing-library/react';
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

import {
  __resetOidcClientRegistryForTests,
  registerMockOidcClient,
  tryGetOidcClient,
  unregisterMockOidcClient,
} from './oidcClientRegistry';
import { OidcMockProvider } from './OidcMockProvider';
import { useOidc, useOidcAccessToken, useOidcIdToken } from './ReactOidc';
import { OidcUserStatus, useOidcUser } from './User';

describe('OidcMockProvider', () => {
  beforeEach(() => {
    __resetOidcClientRegistryForTests();
    mockGet.mockReset();
    mockGet.mockImplementation(() => {
      throw new Error('OIDC library does seem initialized.');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapperFor = (value: Parameters<typeof OidcMockProvider>[0]['value']) => {
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <OidcMockProvider value={value}>{children}</OidcMockProvider>
    );
    return Wrapper;
  };

  it('provides an authenticated state to useOidc', () => {
    const { result } = renderHook(() => useOidc(), {
      wrapper: wrapperFor({ isAuthenticated: true, accessToken: 'fake-access-token' }),
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('exposes mocked access and id tokens to the token hooks', () => {
    const accessTokenResult = renderHook(() => useOidcAccessToken(), {
      wrapper: wrapperFor({
        isAuthenticated: true,
        accessToken: 'mock-access-token',
        accessTokenPayload: { sub: '123' },
      }),
    });

    expect(accessTokenResult.result.current.accessToken).toBe('mock-access-token');
    expect(accessTokenResult.result.current.accessTokenPayload).toEqual({ sub: '123' });

    const idTokenResult = renderHook(() => useOidcIdToken(), {
      wrapper: wrapperFor({
        isAuthenticated: true,
        idToken: 'mock-id-token',
        idTokenPayload: { sub: '123', name: 'Jane' },
      }),
    });

    expect(idTokenResult.result.current.idToken).toBe('mock-id-token');
    expect(idTokenResult.result.current.idTokenPayload).toEqual({ sub: '123', name: 'Jane' });
  });

  it('exposes a mocked user info object to useOidcUser', () => {
    const user = { sub: 'user-1', name: 'Jane Doe' };
    const { result } = renderHook(() => useOidcUser(), {
      wrapper: wrapperFor({ isAuthenticated: true, user }),
    });

    expect(result.current.oidcUser).toEqual(user);
    expect(result.current.oidcUserLoadingState).toBe(OidcUserStatus.Loaded);
  });

  it('falls back to unauthenticated state when isAuthenticated is false', () => {
    const { result } = renderHook(() => useOidc(), {
      wrapper: wrapperFor({ isAuthenticated: false }),
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('renders its children', () => {
    render(
      <OidcMockProvider value={{ isAuthenticated: true }}>
        <span>protected content</span>
      </OidcMockProvider>,
    );

    expect(screen.getByText('protected content')).toBeTruthy();
  });

  it('unregisters the mock client when unmounted so later hook calls return null', () => {
    const { unmount } = render(
      <OidcMockProvider configurationName="scoped" value={{ isAuthenticated: true }}>
        <span>child</span>
      </OidcMockProvider>,
    );

    expect(tryGetOidcClient('scoped')).not.toBeNull();
    unmount();
    expect(tryGetOidcClient('scoped')).toBeNull();
  });
});

describe('registerMockOidcClient / unregisterMockOidcClient', () => {
  beforeEach(() => {
    __resetOidcClientRegistryForTests();
    mockGet.mockReset();
    mockGet.mockImplementation(() => {
      throw new Error('OIDC library does seem initialized.');
    });
  });

  it('allows imperative registration of a custom mock client', () => {
    const fakeClient = { tokens: { accessToken: 'imperative' } };
    registerMockOidcClient('imperative', fakeClient);

    expect(tryGetOidcClient('imperative')).toBe(fakeClient);

    unregisterMockOidcClient('imperative');
    expect(tryGetOidcClient('imperative')).toBeNull();
  });

  it('takes precedence over the real OidcClient.get when both are registered', () => {
    mockGet.mockReturnValue({ tokens: { accessToken: 'real' } });
    const fakeClient = { tokens: { accessToken: 'mock' } };
    registerMockOidcClient('default', fakeClient);

    expect(tryGetOidcClient('default')).toBe(fakeClient);
  });
});
