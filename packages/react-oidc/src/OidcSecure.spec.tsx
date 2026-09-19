import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OidcSecure, withOidcSecure } from './OidcSecure';

const { getOrThrow, loginAsync } = vi.hoisted(() => ({
  getOrThrow: vi.fn(),
  loginAsync: vi.fn(),
}));

vi.mock('@axa-fr/oidc-client', () => ({ OidcClient: { getOrThrow } }));

describe('OidcSecure', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders children without logging in when tokens are present', () => {
    getOrThrow.mockReturnValue({ tokens: {}, loginAsync });

    render(<OidcSecure>Protected content</OidcSecure>);

    expect(screen.getByText('Protected content')).toBeDefined();
    expect(getOrThrow).toHaveBeenCalledWith('default');
    expect(loginAsync).not.toHaveBeenCalled();
  });

  it('hides children and starts login with the supplied configuration and arguments', () => {
    getOrThrow.mockReturnValue({ tokens: null, loginAsync });
    const extras = { prompt: 'login' };

    render(
      <OidcSecure configurationName="custom" callbackPath="/private" extras={extras}>
        Protected content
      </OidcSecure>,
    );

    expect(screen.queryByText('Protected content')).toBeNull();
    expect(getOrThrow).toHaveBeenCalledWith('custom');
    expect(loginAsync).toHaveBeenCalledExactlyOnceWith('/private', extras);
  });

  it('does not restart login while logout is in progress', () => {
    getOrThrow.mockReturnValue({ tokens: null, isLoggingOut: true, loginAsync });

    render(<OidcSecure>Protected content</OidcSecure>);

    expect(screen.queryByText('Protected content')).toBeNull();
    expect(loginAsync).not.toHaveBeenCalled();
  });

  it('does not repeat login on an unchanged render', () => {
    getOrThrow.mockReturnValue({ tokens: null, loginAsync });
    const { rerender } = render(<OidcSecure>Protected content</OidcSecure>);

    rerender(<OidcSecure>Protected content</OidcSecure>);

    expect(loginAsync).toHaveBeenCalledExactlyOnceWith(null, null);
  });

  it('preserves the fail-fast behavior for a missing configuration', () => {
    const error = new Error('Missing configuration');
    getOrThrow.mockImplementation(() => {
      throw error;
    });

    expect(() => render(<OidcSecure>Protected content</OidcSecure>)).toThrow(error);
  });

  it('passes props through the higher-order component', () => {
    getOrThrow.mockReturnValue({ tokens: {}, loginAsync });
    const Component = withOidcSecure(
      ({ children }) => <span>{children}</span>,
      '/callback',
      null,
      'custom',
    );

    render(<Component>Wrapped content</Component>);

    expect(screen.getByText('Wrapped content')).toBeDefined();
    expect(getOrThrow).toHaveBeenCalledWith('custom');
  });
});
