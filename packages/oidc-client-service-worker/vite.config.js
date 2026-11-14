import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => ({
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**'],
    }),
  ],
  build: {
    emptyOutDir: mode !== 'protocol',
    minify: false, //default esbuild
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, mode === 'protocol' ? './src/protocol.ts' : './src/OidcServiceWorker.ts'),
      name: 'OidcServiceWorker',
      formats: mode === 'protocol' ? ['es'] : ['iife'],
      // the proper extensions will be added
      fileName: () => mode === 'protocol' ? 'protocol.js' : 'OidcServiceWorker.js',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      //   external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
      },
    },
  },
}));
