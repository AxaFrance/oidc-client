import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockEventSubscribers: Array<{ id: string; func: (name: string, data: any) => void }> = [];
const mockPublishEvent = vi.fn((eventName, data) => {
  mockEventSubscribers.forEach(sub => sub.func(eventName, data));
});
const mockSubscribeEvents = vi.fn(func => {
  const id = Math.random().toString();
  mockEventSubscribers.push({ id, func });
  return id;
});
const mockRemoveEventSubscription = vi.fn(id => {
  mockEventSubscribers = mockEventSubscribers.filter(e => e.id !== id);
});

const mockOidcInstance: {
  subscribeEvents: typeof mockSubscribeEvents;
  removeEventSubscription: typeof mockRemoveEventSubscription;
  publishEvent: typeof mockPublishEvent;
  configuration: Record<string, string>;
  tryKeepExistingSessionAsync: ReturnType<typeof vi.fn>;
  tokens: unknown;
} = {
  subscribeEvents: mockSubscribeEvents,
  removeEventSubscription: mockRemoveEventSubscription,
  publishEvent: mockPublishEvent,
  configuration: {
    redirect_uri: 'http://localhost/callback',
    silent_redirect_uri: 'http://localhost/silent-callback',
    silent_login_uri: 'http://localhost/silent-login',
  },
  tryKeepExistingSessionAsync: vi.fn().mockResolvedValue(true),
  tokens: null,
};

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    getOrCreate: vi.fn(() => () => mockOidcInstance),
    get: vi.fn(() => mockOidcInstance),
    eventNames: {
      service_worker_not_supported_by_browser: 'service_worker_not_supported_by_browser',
      token_acquired: 'token_acquired',
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      token_renewed: 'token_renewed',
      token_timer: 'token_timer',
      loginAsync_begin: 'loginAsync_begin',
      loginAsync_error: 'loginAsync_error',
      loginCallbackAsync_begin: 'loginCallbackAsync_begin',
      loginCallbackAsync_end: 'loginCallbackAsync_end',
      loginCallbackAsync_error: 'loginCallbackAsync_error',
      refreshTokensAsync_begin: 'refreshTokensAsync_begin',
      refreshTokensAsync: 'refreshTokensAsync',
      refreshTokensAsync_end: 'refreshTokensAsync_end',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      refreshTokensAsync_silent_error: 'refreshTokensAsync_silent_error',
      tryKeepExistingSessionAsync_begin: 'tryKeepExistingSessionAsync_begin',
      tryKeepExistingSessionAsync_end: 'tryKeepExistingSessionAsync_end',
      tryKeepExistingSessionAsync_error: 'tryKeepExistingSessionAsync_error',
      silentLoginAsync_begin: 'silentLoginAsync_begin',
      silentLoginAsync: 'silentLoginAsync',
      silentLoginAsync_end: 'silentLoginAsync_end',
      silentLoginAsync_error: 'silentLoginAsync_error',
      syncTokensAsync_begin: 'syncTokensAsync_begin',
      syncTokensAsync_lock_not_available: 'syncTokensAsync_lock_not_available',
      syncTokensAsync_end: 'syncTokensAsync_end',
      syncTokensAsync_error: 'syncTokensAsync_error',
      tokensInvalidAndWaitingActionsToRefresh: 'tokensInvalidAndWaitingActionsToRefresh',
      loadingTimeout_error: 'loadingTimeout_error',
    },
  },
  OidcLocation: class {
    getCurrentHref() {
      return 'http://localhost/';
    }
    getPath() {
      return '/';
    }
    open() {}
    reload() {}
    getOrigin() {
      return 'http://localhost';
    }
  },
  getFetchDefault: vi.fn(() => fetch),
}));

vi.mock('./core/routes/OidcRoutes.js', () => ({
  default: ({ children }: any) => <div data-testid="oidc-routes">{children}</div>,
}));

import { OidcProvider } from './OidcProvider';

describe('OidcProvider loading timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockEventSubscribers = [];
    mockOidcInstance.tokens = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseConfiguration = {
    client_id: 'test-client',
    redirect_uri: 'http://localhost/callback',
    silent_redirect_uri: 'http://localhost/silent-callback',
    scope: 'openid',
    authority: 'http://localhost/authority',
  };

  it('should fire loadingTimeout_error when stuck in initial loading state', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 100 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 100 });
  });

  it('should fire loadingTimeout_error when stuck in loginAsync_begin state', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 200 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    // Simulate loginAsync_begin event
    act(() => {
      mockEventSubscribers.forEach(sub => sub.func('loginAsync_begin', {}));
    });

    // Reset to track timeout event specifically
    mockPublishEvent.mockClear();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 200 });
  });

  it('should render loadingTimeoutComponent when loadingTimeout_error is triggered', async () => {
    const CustomTimeoutComponent = () => <div data-testid="custom-timeout">Timeout!</div>;

    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 50 }}
        configurationName="default"
        loadingTimeoutComponent={CustomTimeoutComponent}
      >
        <div>App</div>
      </OidcProvider>,
    );

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByTestId('custom-timeout')).toBeTruthy();
  });

  it('should NOT fire loadingTimeout_error when loading_timeout_ms is 0 (disabled)', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 0 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should NOT fire loadingTimeout_error when loading_timeout_ms is negative (disabled)', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: -1 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should NOT fire loadingTimeout_error if provider leaves loading state before deadline', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 500 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    // Advance partway
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Simulate successful callback (leaving loading state)
    act(() => {
      mockEventSubscribers.forEach(sub => sub.func('loginCallbackAsync_end', {}));
    });

    mockPublishEvent.mockClear();

    // Advance past original timeout
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should use default timeout of 30000ms when loading_timeout_ms is not configured', async () => {
    render(
      <OidcProvider configuration={baseConfiguration} configurationName="default">
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(29_999);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 30_000 });
  });

  it('should NOT fire loadingTimeout_error after a silent session restore when authenticated', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 500 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Simulate a successful silent session restore (no loginCallbackAsync_end is emitted).
    act(() => {
      mockEventSubscribers.forEach(sub =>
        sub.func('tryKeepExistingSessionAsync_end', { success: true }),
      );
    });

    mockPublishEvent.mockClear();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should still fire loadingTimeout_error when silent session restore reports no existing session', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 300 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      mockEventSubscribers.forEach(sub =>
        sub.func('tryKeepExistingSessionAsync_end', { success: false }),
      );
    });

    mockPublishEvent.mockClear();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', { timeoutMs: 300 });
  });

  it('should NOT fire loadingTimeout_error when token_acquired fires before the deadline', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 400 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      mockEventSubscribers.forEach(sub => sub.func('token_acquired', {}));
    });

    mockPublishEvent.mockClear();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should NOT fire loadingTimeout_error when token_renewed fires before the deadline', async () => {
    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 400 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      mockEventSubscribers.forEach(sub => sub.func('token_renewed', {}));
    });

    mockPublishEvent.mockClear();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should NOT arm the watchdog when the OIDC client mounts already authenticated', async () => {
    mockOidcInstance.tokens = { accessToken: 'existing-token' };

    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 100 }}
        configurationName="default"
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should propagate loadingTimeout_error through onEvent callback', async () => {
    const onEvent = vi.fn();

    render(
      <OidcProvider
        configuration={{ ...baseConfiguration, loading_timeout_ms: 100 }}
        configurationName="default"
        onEvent={onEvent}
      >
        <div>App</div>
      </OidcProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onEvent).toHaveBeenCalledWith('default', 'loadingTimeout_error', { timeoutMs: 100 });
  });
});
