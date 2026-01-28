import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OidcRoutes from './OidcRoutes';

describe('Authenticating test suite', () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: 'http://example.com:3000/' } as any;
    
    // Mock window event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  it('renders correctly', () => {
    const props = {
      children: 'http://url.com',
      redirect_uri: 'http://example.com:3000/authentication/callback',
      configurationName: '',
      location: {
        pathname: '/',
        search: '',
        hash: '',
      },
    };
    const { asFragment } = render(<OidcRoutes {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
