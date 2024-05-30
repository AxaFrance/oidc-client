import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, 'public/*'],
	},
});
