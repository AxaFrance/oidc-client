import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

const dependencies = externalDependencies();
console.log('external dependencies:', dependencies);

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, './src/index.ts'),
			name: 'react-oidc',
			formats: ['es', 'umd'],
			fileName: 'index',
		},
		rollupOptions: {
			external: [...dependencies, 'react/jsx-runtime'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
			},
		},
	},

	plugins: [
		dts(), // generate typescript typedefs
		react(),
	],
	resolve: {
		preserveSymlinks: true, // https://github.com/vitejs/vite/issues/11657
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './tests/setup.js',
		coverage: {
			provider: 'v8',
		},
	},
});

function externalDependencies(): Array<string> {
	const deps = Object.keys(pkg.dependencies || {});
	const peerDeps = Object.keys(pkg.peerDependencies || {});
	return [...deps, ...peerDeps];
}
