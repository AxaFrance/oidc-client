import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CallbackManager, { CallBackSuccess } from './Callback.component';

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get: vi.fn(),
  },
}));

vi.mock('../routes/withRouter.js', () => ({
  getCustomHistory: vi.fn(),
}));

import { OidcClient } from '@axa-fr/oidc-client';

import { getCustomHistory } from '../routes/withRouter.js';

describe('CallbackManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = { pathname: '/', href: 'http://localhost/' } as any;
  });

  it('renders CallBackSuccess by default', () => {
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: () => new Promise(() => {}),
    });

    const { container } = render(<CallbackManager configurationName="default" />);
    expect(container.querySelector('.oidc-callback')).toBeTruthy();
  });

  it('calls navigateAfterCallback when provided', async () => {
    const navigateAfterCallback = vi.fn().mockResolvedValue(undefined);
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '/dashboard' }),
    });

    render(
      <CallbackManager configurationName="default" navigateAfterCallback={navigateAfterCallback} />,
    );

    await waitFor(() => {
      expect(navigateAfterCallback).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('uses "/" as default when callbackPath is empty', async () => {
    const navigateAfterCallback = vi.fn().mockResolvedValue(undefined);
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '' }),
    });

    render(
      <CallbackManager configurationName="default" navigateAfterCallback={navigateAfterCallback} />,
    );

    await waitFor(() => {
      expect(navigateAfterCallback).toHaveBeenCalledWith('/');
    });
  });

  it('shows error component when navigateAfterCallback rejects', async () => {
    const navigateAfterCallback = vi.fn().mockRejectedValue(new Error('Navigation failed'));
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '/dashboard' }),
    });

    const ErrorComponent = () => <div data-testid="error">Error occurred</div>;

    render(
      <CallbackManager
        configurationName="default"
        navigateAfterCallback={navigateAfterCallback}
        callBackError={ErrorComponent}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeTruthy();
    });
  });

  it('uses default history replaceState when navigateAfterCallback is not provided', async () => {
    const mockReplaceState = vi.fn();
    (getCustomHistory as any).mockReturnValue({ replaceState: mockReplaceState });
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '/home' }),
    });

    window.location = { pathname: '/home', href: 'http://localhost/home' } as any;

    render(<CallbackManager configurationName="default" />);

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalledWith('/home');
    });
  });

  it('uses withCustomHistory when provided', async () => {
    const mockReplaceState = vi.fn();
    const withCustomHistory = vi.fn().mockReturnValue({ replaceState: mockReplaceState });
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '/app' }),
    });

    window.location = { pathname: '/app', href: 'http://localhost/app' } as any;

    render(<CallbackManager configurationName="default" withCustomHistory={withCustomHistory} />);

    await waitFor(() => {
      expect(withCustomHistory).toHaveBeenCalled();
      expect(mockReplaceState).toHaveBeenCalledWith('/app');
    });
  });

  it('shows error when default navigation does not commit', async () => {
    const mockReplaceState = vi.fn();
    (getCustomHistory as any).mockReturnValue({ replaceState: mockReplaceState });
    (OidcClient.get as any).mockReturnValue({
      loginCallbackAsync: vi.fn().mockResolvedValue({ callbackPath: '/dashboard' }),
    });

    // Simulate navigation not committing — pathname stays different from target
    window.location = { pathname: '/callback', href: 'http://localhost/callback' } as any;

    const ErrorComponent = () => <div data-testid="nav-error">Navigation did not commit</div>;

    render(<CallbackManager configurationName="default" callBackError={ErrorComponent} />);

    await waitFor(() => {
      expect(screen.getByTestId('nav-error')).toBeTruthy();
    });
  });

  it('renders CallBackSuccess component correctly', () => {
    const { container } = render(<CallBackSuccess />);
    expect(container.querySelector('.oidc-callback__title')?.textContent).toBe(
      'Authentication complete',
    );
  });
});
