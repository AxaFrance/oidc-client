import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, './src/index.ts'),
			name: 'oidc-client',
			formats: ['es', 'umd'],
			fileName: 'index',
		},
	},

	plugins: [
		dts(), // generate typescript typedefs
	],
	resolve: {
		preserveSymlinks: true, // https://github.com/vitejs/vite/issues/11657
	},
});
