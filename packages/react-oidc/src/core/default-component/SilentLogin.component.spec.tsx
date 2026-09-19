import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SilentLogin from './SilentLogin.component';

const { getOrThrow, getParseQueryStringFromLocation, loginAsync } = vi.hoisted(() => ({
  getOrThrow: vi.fn(),
  getParseQueryStringFromLocation: vi.fn(),
  loginAsync: vi.fn(),
}));

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: { getOrThrow },
  getParseQueryStringFromLocation,
}));

describe('silent login', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getOrThrow.mockReturnValue({ tokens: null, loginAsync });
  });

  it.each([{}, { state: 'state' }, { state: 'state', scope: 'openid' }])(
    'passes null extras when the query contains only reserved parameters: %s',
    query => {
      getParseQueryStringFromLocation.mockReturnValue(query);

      render(<SilentLogin configurationName="custom" />);

      expect(getOrThrow).toHaveBeenCalledWith('custom');
      expect(loginAsync).toHaveBeenCalledExactlyOnceWith(null, null, true, query.scope);
    },
  );

  it('forwards non-reserved parameters without changing the query data', () => {
    const query = Object.freeze({
      state: 'state',
      scope: 'openid profile',
      prompt: 'none',
      login_hint: 'example',
    });
    getParseQueryStringFromLocation.mockReturnValue(query);

    render(<SilentLogin configurationName="custom" />);

    expect(loginAsync).toHaveBeenCalledExactlyOnceWith(
      null,
      { prompt: 'none', login_hint: 'example' },
      true,
      'openid profile',
    );
  });

  it('does not start login when already authenticated', () => {
    getParseQueryStringFromLocation.mockReturnValue({});
    getOrThrow.mockReturnValue({ tokens: {}, loginAsync });

    render(<SilentLogin configurationName="custom" />);

    expect(loginAsync).not.toHaveBeenCalled();
  });

  it('only starts silent login on the initial mount', () => {
    getParseQueryStringFromLocation.mockReturnValue({ prompt: 'none' });
    const { rerender } = render(<SilentLogin configurationName="custom" />);

    rerender(<SilentLogin configurationName="custom" />);

    expect(loginAsync).toHaveBeenCalledOnce();
  });
});
