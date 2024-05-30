import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import OidcRoutes from './OidcRoutes';

describe('Authenticating test suite', () => {
	it('renders correctly', () => {
		const props = {
			children: 'http://url.com',
			callbackComponent: () => <div>tcallback component</div>,
			redirect_uri: 'http://example.com:3000/authentication/callback',
			configurationName: '',
		};
		const { asFragment } = render(<OidcRoutes {...props} />);
		expect(asFragment()).toMatchSnapshot();
	});
});
