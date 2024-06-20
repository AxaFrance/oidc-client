import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'./packages/oidc-client/vite.config.ts',
	'./packages/oidc-client-service-worker/vite.config.js',
	'./examples/react-oidc-demo/vitest.config.ts',
	'./examples/oidc-client-demo/vite.config.js',
	'./packages/react-oidc/vite.config.ts',
]);
