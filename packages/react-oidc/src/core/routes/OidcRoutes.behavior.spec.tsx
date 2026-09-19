import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Callback from '../default-component/Callback.component';
import SilentCallback from '../default-component/SilentCallback.component';
import SilentLogin from '../default-component/SilentLogin.component';
import OidcRoutes from './OidcRoutes';

vi.mock('../default-component/Callback.component', () => ({
  default: vi.fn(() => <span>Callback</span>),
}));
vi.mock('../default-component/SilentCallback.component', () => ({
  default: vi.fn(() => <span>Silent callback</span>),
}));
vi.mock('../default-component/SilentLogin.component', () => ({
  default: vi.fn(() => <span>Silent login</span>),
}));

const props = {
  configurationName: 'custom',
  redirect_uri: new URL('/callback', window.location.href).href,
  silent_redirect_uri: new URL('/silent-callback', window.location.href).href,
  silent_login_uri: new URL('/silent-login', window.location.href).href,
  location: {
    getCurrentHref: () => window.location.href,
    getPath: () => window.location.pathname,
    getOrigin: () => window.location.origin,
    open: vi.fn(),
    reload: vi.fn(),
  },
};

describe('OIDC route selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('renders application content on a non-OIDC route', () => {
    render(<OidcRoutes {...props}>Application</OidcRoutes>);

    expect(screen.getByText('Application')).toBeDefined();
    expect(Callback).not.toHaveBeenCalled();
    expect(SilentCallback).not.toHaveBeenCalled();
    expect(SilentLogin).not.toHaveBeenCalled();
  });

  it.each([
    ['/callback?code=example#', 'Callback', Callback],
    ['/silent-callback', 'Silent callback', SilentCallback],
    ['/silent-login', 'Silent login', SilentLogin],
  ])('renders the matching handler for %s', (path, text, handler) => {
    window.history.replaceState(null, '', path);

    render(<OidcRoutes {...props}>Application</OidcRoutes>);

    expect(screen.getByText(text)).toBeDefined();
    expect(screen.queryByText('Application')).toBeNull();
    expect(vi.mocked(handler).mock.calls[0][0]).toMatchObject({ configurationName: 'custom' });
  });

  it('gives the silent callback priority when configured paths overlap', () => {
    window.history.replaceState(null, '', '/callback');

    render(
      <OidcRoutes
        {...props}
        silent_redirect_uri={props.redirect_uri}
        silent_login_uri={props.redirect_uri}
      />,
    );

    expect(screen.getByText('Silent callback')).toBeDefined();
    expect(Callback).not.toHaveBeenCalled();
    expect(SilentLogin).not.toHaveBeenCalled();
  });

  it('forwards custom callback components and navigation callbacks unchanged', () => {
    window.history.replaceState(null, '', '/callback');
    const success = (): null => null;
    const error = (): null => null;
    const history = vi.fn();
    const navigate = vi.fn();

    render(
      <OidcRoutes
        {...props}
        callbackSuccessComponent={success}
        callbackErrorComponent={error}
        withCustomHistory={history}
        navigateAfterCallback={navigate}
      />,
    );

    expect(vi.mocked(Callback).mock.calls[0][0]).toMatchObject({
      callBackSuccess: success,
      callBackError: error,
      withCustomHistory: history,
      navigateAfterCallback: navigate,
    });
  });

  it('updates the route on popstate and removes its listener on unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<OidcRoutes {...props}>Application</OidcRoutes>);
    const listener = addEventListener.mock.calls.find(([name]) => name === 'popstate')[1];

    act(() => {
      window.history.replaceState(null, '', '/silent-login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('Silent login')).toBeDefined();

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('popstate', listener, false);
  });
});
