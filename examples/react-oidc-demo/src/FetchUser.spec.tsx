// @vitest-environment jsdom
import type { Fetch } from '@axa-fr/react-oidc';
import { OidcSecure, useOidcFetch } from '@axa-fr/react-oidc';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchUserHook } from './FetchUser';

vi.mock('@axa-fr/react-oidc', () => ({
  OidcSecure: vi.fn(({ children }: PropsWithChildren) => <>{children}</>),
  useOidcFetch: vi.fn(),
  withOidcFetch: (fetch: Fetch) => (Component: ComponentType<{ fetch: Fetch }>) =>
    function WithFetch() {
      return <Component fetch={fetch} />;
    },
}));

describe('user-info fetch demo', () => {
  const authenticatedFetch = vi.fn<Fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    authenticatedFetch.mockReset();
    vi.mocked(useOidcFetch).mockReturnValue({ fetch: authenticatedFetch });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading until the response arrives, then displays the user', async () => {
    let resolveResponse: (response: Response) => void;
    authenticatedFetch.mockReturnValue(
      new Promise<Response>(resolve => {
        resolveResponse = resolve;
      }),
    );
    const user = { sub: 'example', name: 'Example user' };

    render(<FetchUserHook configurationName="custom" demonstratingProofOfPossession />);
    expect(screen.getByText('Loading')).toBeDefined();
    expect(useOidcFetch).toHaveBeenCalledWith(window.fetch, 'custom', true);
    expect(vi.mocked(OidcSecure).mock.calls[0][0].configurationName).toBe('custom');
    expect(authenticatedFetch).toHaveBeenCalledExactlyOnceWith(
      'https://demo.duendesoftware.com/connect/userinfo',
    );

    await act(async () => resolveResponse(new Response(JSON.stringify(user))));

    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.getByText(JSON.stringify(user))).toBeDefined();
  });

  it.each([201, 400, 401, 500])('does not display user data for HTTP %i', async status => {
    const user = { sub: 'example' };
    authenticatedFetch.mockResolvedValue(new Response(JSON.stringify(user), { status }));

    render(<FetchUserHook />);

    await screen.findByText('User information');
    expect(screen.queryByText('Loading')).toBeNull();
    expect(screen.queryByText(JSON.stringify(user))).toBeNull();
  });

  it('defaults proof of possession to false and does not refetch on rerender', async () => {
    authenticatedFetch.mockResolvedValue(new Response('{}'));
    const { rerender } = render(<FetchUserHook />);
    await screen.findByText('User information');

    rerender(<FetchUserHook />);

    expect(useOidcFetch).toHaveBeenCalledWith(window.fetch, undefined, false);
    expect(authenticatedFetch).toHaveBeenCalledOnce();
  });
});
