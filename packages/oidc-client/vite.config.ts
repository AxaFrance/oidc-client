import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import pkg from './package.json';

const dependencies = externalDependencies();
console.log('external dependencies:', dependencies);

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      name: 'oidc-client',
      formats: ['es', 'umd'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [...dependencies],
    },
  },

  plugins: [
    dts(), //generate typescript typedefs
  ],
  resolve: {
    preserveSymlinks: true, //https://github.com/vitejs/vite/issues/11657
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
});

function externalDependencies(): Array<string> {
  const deps = Object.keys(pkg.dependencies || {});
  const peerDeps = Object.keys(pkg.peerDependencies || {});
  return [...deps, ...peerDeps];
}
