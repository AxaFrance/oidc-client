import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSubscribeEvents, mockPublishEvent, mockTryKeepExistingSessionAsync } = vi.hoisted(
  () => ({
    mockSubscribeEvents: vi.fn().mockReturnValue('subscription-id'),
    mockPublishEvent: vi.fn(),
    mockTryKeepExistingSessionAsync: vi.fn().mockResolvedValue(true),
  }),
);

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    getOrCreate: vi.fn(() => () => ({
      subscribeEvents: mockSubscribeEvents,
      removeEventSubscription: vi.fn(),
      publishEvent: mockPublishEvent,
      configuration: {
        redirect_uri: 'http://localhost/callback',
        silent_redirect_uri: 'http://localhost/silent-callback',
        silent_login_uri: undefined,
      },
    })),
    get: vi.fn(() => ({
      subscribeEvents: mockSubscribeEvents,
      removeEventSubscription: vi.fn(),
      publishEvent: mockPublishEvent,
      tryKeepExistingSessionAsync: mockTryKeepExistingSessionAsync,
    })),
    eventNames: {
      service_worker_not_supported_by_browser: 'service_worker_not_supported_by_browser',
      token_acquired: 'token_acquired',
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      token_renewed: 'token_renewed',
      loginAsync_begin: 'loginAsync_begin',
      loginAsync_error: 'loginAsync_error',
      loginCallbackAsync_end: 'loginCallbackAsync_end',
      loginCallbackAsync_error: 'loginCallbackAsync_error',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      syncTokensAsync_error: 'syncTokensAsync_error',
      loadingTimeout_error: 'loadingTimeout_error',
    },
  },
  OidcLocation: class {
    getLocation() {
      return 'http://localhost/';
    }
    getPath() {
      return '/';
    }
  },
  getFetchDefault: vi.fn(() => fetch),
}));

vi.mock('./core/routes/OidcRoutes.js', () => ({
  default: ({ children }: { children: any }) => <div data-testid="oidc-routes">{children}</div>,
}));

import { OidcProvider } from './OidcProvider';

const eventNames = {
  loginAsync_begin: 'loginAsync_begin',
  loginCallbackAsync_end: 'loginCallbackAsync_end',
  loadingTimeout_error: 'loadingTimeout_error',
};

const mockConfiguration = {
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
    mockSubscribeEvents.mockReturnValue('subscription-id');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fire loadingTimeout_error event when authenticating state exceeds timeout', async () => {
    let eventSubscriber: (name: string, data: any) => void;
    mockSubscribeEvents.mockImplementation(fn => {
      eventSubscriber = fn;
      return 'subscription-id';
    });

    const onEvent = vi.fn();
    const configWithTimeout = {
      ...mockConfiguration,
      loading_timeout_ms: 5000,
    };

    render(
      <OidcProvider configuration={configWithTimeout} onEvent={onEvent}>
        <div>App Content</div>
      </OidcProvider>,
    );

    // Simulate loginAsync_begin event (authenticating state)
    await act(async () => {
      eventSubscriber(eventNames.loginAsync_begin, {});
    });

    // Advance time past the timeout
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Verify that publishEvent was called with loadingTimeout_error
    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', {
      timeoutMs: 5000,
    });
  });

  it('should not fire loadingTimeout_error when loading_timeout_ms is not set', async () => {
    let eventSubscriber: (name: string, data: any) => void;
    mockSubscribeEvents.mockImplementation(fn => {
      eventSubscriber = fn;
      return 'subscription-id';
    });

    render(
      <OidcProvider configuration={mockConfiguration}>
        <div>App Content</div>
      </OidcProvider>,
    );

    // Simulate loginAsync_begin event (authenticating state)
    await act(async () => {
      eventSubscriber(eventNames.loginAsync_begin, {});
    });

    // Advance time well past any reasonable timeout
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    // Verify that publishEvent was NOT called
    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should not fire loadingTimeout_error if state transitions before timeout', async () => {
    let eventSubscriber: (name: string, data: any) => void;
    mockSubscribeEvents.mockImplementation(fn => {
      eventSubscriber = fn;
      return 'subscription-id';
    });

    const configWithTimeout = {
      ...mockConfiguration,
      loading_timeout_ms: 5000,
    };

    render(
      <OidcProvider configuration={configWithTimeout}>
        <div>App Content</div>
      </OidcProvider>,
    );

    // Simulate loginAsync_begin event (authenticating state)
    await act(async () => {
      eventSubscriber(eventNames.loginAsync_begin, {});
    });

    // Advance time partially
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Simulate state transition (e.g., loginCallbackAsync_end)
    await act(async () => {
      eventSubscriber(eventNames.loginCallbackAsync_end, {});
    });

    // Advance time past the original timeout
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Verify that publishEvent was NOT called with loadingTimeout_error
    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });

  it('should render authenticatingErrorComponent when loadingTimeout_error event fires', async () => {
    let eventSubscriber: (name: string, data: any) => void;
    mockSubscribeEvents.mockImplementation(fn => {
      eventSubscriber = fn;
      return 'subscription-id';
    });

    const CustomErrorComponent = () => <div data-testid="timeout-error">Loading timed out</div>;
    const configWithTimeout = {
      ...mockConfiguration,
      loading_timeout_ms: 5000,
    };

    render(
      <OidcProvider
        configuration={configWithTimeout}
        authenticatingErrorComponent={CustomErrorComponent}
      >
        <div>App Content</div>
      </OidcProvider>,
    );

    // Simulate loadingTimeout_error event directly
    await act(async () => {
      eventSubscriber(eventNames.loadingTimeout_error, { timeoutMs: 5000 });
    });

    expect(screen.getByTestId('timeout-error')).toBeDefined();
  });
});

describe('OidcSession loading timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSubscribeEvents.mockReturnValue('subscription-id');
    // Make tryKeepExistingSessionAsync never resolve to simulate stuck loading
    mockTryKeepExistingSessionAsync.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fire loadingTimeout_error when OidcSession loading exceeds timeout', async () => {
    mockSubscribeEvents.mockImplementation(() => {
      return 'subscription-id';
    });

    const configWithTimeout = {
      ...mockConfiguration,
      loading_timeout_ms: 5000,
    };

    render(
      <OidcProvider configuration={configWithTimeout}>
        <div>App Content</div>
      </OidcProvider>,
    );

    // Advance time past the timeout
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Verify that publishEvent was called with loadingTimeout_error
    expect(mockPublishEvent).toHaveBeenCalledWith('loadingTimeout_error', {
      timeoutMs: 5000,
    });
  });

  it('should not fire loadingTimeout_error when session resolves before timeout', async () => {
    mockTryKeepExistingSessionAsync.mockResolvedValue(true);

    mockSubscribeEvents.mockImplementation(() => {
      return 'subscription-id';
    });

    const configWithTimeout = {
      ...mockConfiguration,
      loading_timeout_ms: 5000,
    };

    await act(async () => {
      render(
        <OidcProvider configuration={configWithTimeout}>
          <div>App Content</div>
        </OidcProvider>,
      );
    });

    // Advance time past the timeout
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Verify that publishEvent was NOT called with loadingTimeout_error
    expect(mockPublishEvent).not.toHaveBeenCalledWith('loadingTimeout_error', expect.anything());
  });
});
