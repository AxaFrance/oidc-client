import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CallbackManager, { CallBackSuccess, verifyNavigationCommitted } from './Callback.component';

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(),
    getOrThrow: vi.fn(),
    eventNames: {
      loginCallbackAsync_navigated: 'loginCallbackAsync_navigated',
      loginCallbackAsync_navigation_error: 'loginCallbackAsync_navigation_error',
    },
  },
}));

vi.mock('../routes/withRouter.js', () => ({
  getCustomHistory: vi.fn(),
}));

import { OidcClient } from '@axa-fr/oidc-client';

import { getCustomHistory } from '../routes/withRouter.js';

describe('verifyNavigationCommitted', () => {
  it('should return true when current path matches target path', () => {
    const windowMock = { location: { pathname: '/dashboard' } } as Window;
    expect(verifyNavigationCommitted('/dashboard', windowMock)).toBe(true);
  });

  it('should return false when current path does not match target path', () => {
    const windowMock = { location: { pathname: '/callback' } } as Window;
    expect(verifyNavigationCommitted('/dashboard', windowMock)).toBe(false);
  });

  it('should return true when target path is root', () => {
    const windowMock = { location: { pathname: '/anything' } } as Window;
    expect(verifyNavigationCommitted('/', windowMock)).toBe(true);
  });
});

describe('CallBackSuccess', () => {
  it('renders the success message', () => {
    const { getByText } = render(<CallBackSuccess />);
    expect(getByText('Authentication complete')).toBeTruthy();
    expect(getByText('You will be redirected to your application.')).toBeTruthy();
  });
});

describe('CallbackManager', () => {
  let mockPublishEvent: ReturnType<typeof vi.fn>;
  let mockLoginCallbackAsync: ReturnType<typeof vi.fn>;
  let mockReplaceState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPublishEvent = vi.fn();
    mockLoginCallbackAsync = vi.fn();
    mockReplaceState = vi.fn();

    (OidcClient.getOrThrow as ReturnType<typeof vi.fn>).mockReturnValue({
      loginCallbackAsync: mockLoginCallbackAsync,
      publishEvent: mockPublishEvent,
    });

    (getCustomHistory as ReturnType<typeof vi.fn>).mockReturnValue({
      replaceState: mockReplaceState,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should use navigateAfterCallback when provided and emit navigated event on success', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });
    const navigateAfterCallback = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <CallbackManager
          configurationName="default"
          navigateAfterCallback={navigateAfterCallback}
        />,
      );
    });

    expect(navigateAfterCallback).toHaveBeenCalledWith('/dashboard');
    expect(mockPublishEvent).toHaveBeenCalledWith('loginCallbackAsync_navigated', {
      configurationName: 'default',
      callbackPath: '/dashboard',
    });
  });

  it('should emit navigation_error event when navigateAfterCallback rejects', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });
    const navError = new Error('Navigation failed');
    const navigateAfterCallback = vi.fn().mockRejectedValue(navError);

    await act(async () => {
      render(
        <CallbackManager
          configurationName="default"
          navigateAfterCallback={navigateAfterCallback}
        />,
      );
    });

    expect(mockPublishEvent).toHaveBeenCalledWith('loginCallbackAsync_navigation_error', {
      configurationName: 'default',
      callbackPath: '/dashboard',
      error: navError,
    });
  });

  it('should render error component when navigateAfterCallback fails', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });
    const navigateAfterCallback = vi.fn().mockRejectedValue(new Error('fail'));

    const ErrorComponent = () => <div>Error occurred</div>;

    let container;
    await act(async () => {
      const result = render(
        <CallbackManager
          configurationName="default"
          navigateAfterCallback={navigateAfterCallback}
          callBackError={ErrorComponent}
        />,
      );
      container = result.container;
    });

    expect(container.textContent).toContain('Error occurred');
  });

  it('should use default history navigation when navigateAfterCallback is not provided', async () => {
    vi.useRealTimers();
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });

    // Mock window.location to simulate successful navigation
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard' },
      writable: true,
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" />);
      // Wait for the verification delay to pass
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    expect(mockReplaceState).toHaveBeenCalledWith('/dashboard');

    await waitFor(() => {
      expect(mockPublishEvent).toHaveBeenCalledWith('loginCallbackAsync_navigated', {
        configurationName: 'default',
        callbackPath: '/dashboard',
      });
    });
  });

  it('should emit navigation_error when default navigation does not commit', async () => {
    vi.useRealTimers();
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/dashboard' });

    // Mock window.location to simulate failed navigation
    Object.defineProperty(window, 'location', {
      value: { pathname: '/callback' },
      writable: true,
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" />);
      // Wait for the verification delay to pass
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    await waitFor(() => {
      expect(mockPublishEvent).toHaveBeenCalledWith(
        'loginCallbackAsync_navigation_error',
        expect.objectContaining({
          configurationName: 'default',
          callbackPath: '/dashboard',
        }),
      );
    });
  });

  it('should use "/" as fallback when callbackPath is empty', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '' });
    const navigateAfterCallback = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      render(
        <CallbackManager
          configurationName="default"
          navigateAfterCallback={navigateAfterCallback}
        />,
      );
    });

    expect(navigateAfterCallback).toHaveBeenCalledWith('/');
  });

  it('should use withCustomHistory when provided and no navigateAfterCallback', async () => {
    mockLoginCallbackAsync.mockResolvedValue({ callbackPath: '/profile' });
    const customReplaceState = vi.fn();
    const withCustomHistory = vi.fn().mockReturnValue({ replaceState: customReplaceState });

    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    });

    await act(async () => {
      render(<CallbackManager configurationName="default" withCustomHistory={withCustomHistory} />);
    });

    expect(withCustomHistory).toHaveBeenCalled();
    expect(customReplaceState).toHaveBeenCalledWith('/profile');
  });

  it('should set error state when loginCallbackAsync throws', async () => {
    mockLoginCallbackAsync.mockRejectedValue(new Error('login error'));

    const ErrorComponent = () => <div>Login Error</div>;

    let container;
    await act(async () => {
      const result = render(
        <CallbackManager configurationName="default" callBackError={ErrorComponent} />,
      );
      container = result.container;
    });

    expect(container.textContent).toContain('Login Error');
  });

  it('should render success component by default', () => {
    mockLoginCallbackAsync.mockReturnValue(new Promise(() => {})); // never resolves

    const { getByText } = render(<CallbackManager configurationName="default" />);

    expect(getByText('Authentication complete')).toBeTruthy();
  });
});
