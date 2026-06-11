import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSubscribeEvents = vi.fn().mockReturnValue('subscription-id');
const mockRemoveEventSubscription = vi.fn();
const mockPublishEvent = vi.fn();
const mockTryKeepExistingSessionAsync = vi.fn();

let currentMockConfiguration: any = {
  client_id: 'test-client',
  redirect_uri: 'http://localhost/callback',
  silent_redirect_uri: 'http://localhost/silent-callback',
  scope: 'openid',
  authority: 'http://localhost/authority',
};

const getMockOidcInstance = () => ({
  tokens: null,
  get configuration() {
    return currentMockConfiguration;
  },
  subscribeEvents: mockSubscribeEvents,
  removeEventSubscription: mockRemoveEventSubscription,
  publishEvent: mockPublishEvent,
  tryKeepExistingSessionAsync: mockTryKeepExistingSessionAsync,
});

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(() => getMockOidcInstance()),
    getOrCreate: vi.fn(() => () => getMockOidcInstance()),
    eventNames: {
      service_worker_not_supported_by_browser: 'service_worker_not_supported_by_browser',
      token_acquired: 'token_acquired',
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      loginAsync_begin: 'loginAsync_begin',
      loginAsync_error: 'loginAsync_error',
      loginCallbackAsync_end: 'loginCallbackAsync_end',
      loginCallbackAsync_error: 'loginCallbackAsync_error',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      syncTokensAsync_error: 'syncTokensAsync_error',
      tryKeepExistingSessionAsync_begin: 'tryKeepExistingSessionAsync_begin',
      tryKeepExistingSessionAsync_end: 'tryKeepExistingSessionAsync_end',
      tryKeepExistingSessionAsync_error: 'tryKeepExistingSessionAsync_error',
      loadingTimeout_error: 'loadingTimeout_error',
    },
  },
  OidcLocation: class {
    getLocation() {
      return { href: 'http://localhost/' };
    }
  },
  getFetchDefault: vi.fn(() => fetch),
}));

vi.mock('./core/routes/OidcRoutes.js', () => ({
  default: ({ children }: any) => <div data-testid="oidc-routes">{children}</div>,
}));

import { OidcProvider } from './OidcProvider';

const baseConfiguration = {
  client_id: 'test-client',
  redirect_uri: 'http://localhost/callback',
  silent_redirect_uri: 'http://localhost/silent-callback',
  scope: 'openid',
  authority: 'http://localhost/authority',
};

describe('OidcProvider loading timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    currentMockConfiguration = { ...baseConfiguration };
    mockTryKeepExistingSessionAsync.mockReturnValue(new Promise(() => {})); // never resolves
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should publish loadingTimeout_error when OidcSession loading exceeds default timeout', async () => {
    await act(async () => {
      render(
        <OidcProvider configuration={currentMockConfiguration}>
          <div>children</div>
        </OidcProvider>,
      );
    });

    expect(mockTryKeepExistingSessionAsync).toHaveBeenCalled();

    // Advance past the default 30s timeout
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 30_000 });
  });

  it('should use custom loading_timeout_ms from configuration', async () => {
    currentMockConfiguration = { ...baseConfiguration, loading_timeout_ms: 5_000 };

    await act(async () => {
      render(
        <OidcProvider configuration={currentMockConfiguration}>
          <div>children</div>
        </OidcProvider>,
      );
    });

    expect(mockTryKeepExistingSessionAsync).toHaveBeenCalled();

    // Should not fire before 5s
    act(() => {
      vi.advanceTimersByTime(4_999);
    });
    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());

    // Should fire at 5s
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 5_000 });
  });

  it('should not publish loadingTimeout_error when loading completes before timeout', async () => {
    mockTryKeepExistingSessionAsync.mockResolvedValue(true);

    await act(async () => {
      render(
        <OidcProvider configuration={currentMockConfiguration}>
          <div>children</div>
        </OidcProvider>,
      );
      // flush microtask so tryKeepExistingSessionAsync resolves and isLoading becomes false
      await Promise.resolve();
    });

    // Advance past timeout - should not fire since loading already completed
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should not set timeout when loading_timeout_ms is 0 (disabled)', async () => {
    currentMockConfiguration = { ...baseConfiguration, loading_timeout_ms: 0 };

    await act(async () => {
      render(
        <OidcProvider configuration={currentMockConfiguration}>
          <div>children</div>
        </OidcProvider>,
      );
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should publish loadingTimeout_error when stuck in loginAsync_begin state', async () => {
    mockTryKeepExistingSessionAsync.mockResolvedValue(true);

    await act(async () => {
      render(
        <OidcProvider configuration={currentMockConfiguration}>
          <div>children</div>
        </OidcProvider>,
      );
      await Promise.resolve();
    });

    expect(mockSubscribeEvents).toHaveBeenCalled();

    // Get the event subscriber (second call is the state event subscription)
    const eventSubscriber = mockSubscribeEvents.mock.calls[1][0];
    act(() => {
      eventSubscriber('loginAsync_begin', {});
    });

    // Advance past default timeout
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 30_000 });
  });

  it('should render authenticatingErrorComponent when loadingTimeout_error event is received', async () => {
    mockTryKeepExistingSessionAsync.mockResolvedValue(true);

    const ErrorComponent = () => <div data-testid="auth-error">Timeout Error</div>;

    await act(async () => {
      render(
        <OidcProvider
          configuration={currentMockConfiguration}
          authenticatingErrorComponent={ErrorComponent}
        >
          <div>children</div>
        </OidcProvider>,
      );
      await Promise.resolve();
    });

    expect(mockSubscribeEvents).toHaveBeenCalled();

    // Simulate loadingTimeout_error event
    const eventSubscriber = mockSubscribeEvents.mock.calls[1][0];
    act(() => {
      eventSubscriber('loadingTimeout_error', { timeoutMs: 30_000 });
    });

    expect(screen.getByTestId('auth-error')).toBeDefined();
  });
});
