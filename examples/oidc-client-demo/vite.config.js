import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		sourcemap: true,
		minify: false,
	},
	server: {
		headers: {
			'Content-Security-Policy': "script-src 'self' 'unsafe-eval';",
		},
	},
});
