import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CallbackManager, {
  navigateWithRetry,
  verifyNavigationCommitted,
} from './Callback.component';

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(),
  },
  getPath: (href: string) => {
    try {
      return new URL(href).pathname;
    } catch {
      return href;
    }
  },
}));

vi.mock('../routes/withRouter.js', () => ({
  getCustomHistory: vi.fn(),
}));

import { OidcClient } from '@axa-fr/oidc-client';

import { getCustomHistory } from '../routes/withRouter.js';

describe('CallbackManager', () => {
  const mockLoginCallbackAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (OidcClient.get as ReturnType<typeof vi.fn>).mockReturnValue({
      loginCallbackAsync: mockLoginCallbackAsync,
    });
  });

  it('renders success component when navigation succeeds', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });

    // Mock getCustomHistory to return a replaceState that updates location
    const mockReplaceState = vi.fn(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/dashboard' },
        writable: true,
        configurable: true,
      });
    });
    (getCustomHistory as ReturnType<typeof vi.fn>).mockReturnValue({
      replaceState: mockReplaceState,
    });

    // Mock requestAnimationFrame for verification
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" />);
    });

    // Should have called replaceState with the callback path
    expect(mockReplaceState).toHaveBeenCalledWith('/dashboard');
  });

  it('renders error component when loginCallbackAsync rejects', async () => {
    mockLoginCallbackAsync.mockRejectedValue(new Error('Auth failed'));

    await act(async () => {
      render(<CallbackManager configurationName="default" />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error authentication')).toBeDefined();
    });
  });

  it('uses onNavigateAfterCallback when provided', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/home' });
    const onNavigateAfterCallback = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <CallbackManager
          configurationName="default"
          onNavigateAfterCallback={onNavigateAfterCallback}
        />,
      );
    });

    expect(onNavigateAfterCallback).toHaveBeenCalledWith('/home');
    expect(getCustomHistory).not.toHaveBeenCalled();
  });

  it('uses withCustomHistory when provided', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/app' });

    const mockReplaceState = vi.fn(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/app' },
        writable: true,
        configurable: true,
      });
    });
    const withCustomHistory = vi.fn().mockReturnValue({
      replaceState: mockReplaceState,
    });

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" withCustomHistory={withCustomHistory} />);
    });

    expect(withCustomHistory).toHaveBeenCalled();
    expect(mockReplaceState).toHaveBeenCalledWith('/app');
    expect(getCustomHistory).not.toHaveBeenCalled();
  });

  it('defaults callbackPath to "/" when not provided', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '' });

    const mockReplaceState = vi.fn(() => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/' },
        writable: true,
        configurable: true,
      });
    });
    (getCustomHistory as ReturnType<typeof vi.fn>).mockReturnValue({
      replaceState: mockReplaceState,
    });

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" />);
    });

    expect(mockReplaceState).toHaveBeenCalledWith('/');
  });

  it('renders error when onNavigateAfterCallback rejects', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/home' });
    const onNavigateAfterCallback = vi.fn().mockRejectedValue(new Error('Nav failed'));

    await act(async () => {
      render(
        <CallbackManager
          configurationName="default"
          onNavigateAfterCallback={onNavigateAfterCallback}
        />,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Error authentication')).toBeDefined();
    });
  });
});

describe('navigateWithRetry', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
  });

  it('succeeds on first attempt when URL changes correctly', async () => {
    const windowMock = {
      location: { href: 'http://localhost/target' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    const mockHistory = { replaceState: vi.fn() };

    await navigateWithRetry(mockHistory, '/target', 1, windowMock);

    expect(mockHistory.replaceState).toHaveBeenCalledTimes(1);
    expect(mockHistory.replaceState).toHaveBeenCalledWith('/target');
  });

  it('retries and succeeds on second attempt', async () => {
    let callCount = 0;
    const windowMock = {
      location: { href: 'http://localhost/old' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    const mockHistory = {
      replaceState: vi.fn(() => {
        callCount++;
        if (callCount >= 2) {
          (windowMock as any).location = { href: 'http://localhost/target' };
        }
      }),
    };

    await navigateWithRetry(mockHistory, '/target', 1, windowMock);

    expect(mockHistory.replaceState).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const windowMock = {
      location: { href: 'http://localhost/stuck' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    const mockHistory = { replaceState: vi.fn() };

    await expect(navigateWithRetry(mockHistory, '/target', 1, windowMock)).rejects.toThrow(
      /Navigation failed after 2 attempt/,
    );

    expect(mockHistory.replaceState).toHaveBeenCalledTimes(2);
  });

  it('supports async replaceState', async () => {
    const windowMock = {
      location: { href: 'http://localhost/target' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    const mockHistory = {
      replaceState: vi.fn().mockResolvedValue(undefined),
    };

    await navigateWithRetry(mockHistory, '/target', 0, windowMock);

    expect(mockHistory.replaceState).toHaveBeenCalledTimes(1);
  });
});

describe('verifyNavigationCommitted', () => {
  it('resolves when path matches', async () => {
    const windowMock = {
      location: { href: 'http://localhost/expected' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    await expect(verifyNavigationCommitted('/expected', windowMock)).resolves.toBeUndefined();
  });

  it('rejects when path does not match', async () => {
    const windowMock = {
      location: { href: 'http://localhost/wrong' },
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    } as unknown as Window;

    await expect(verifyNavigationCommitted('/expected', windowMock)).rejects.toThrow(
      /Navigation did not commit/,
    );
  });
});
