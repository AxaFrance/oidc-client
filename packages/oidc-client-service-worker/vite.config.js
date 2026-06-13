import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    minify: false, //default esbuild
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: {
        OidcServiceWorker: resolve(__dirname, './src/OidcServiceWorker.ts'),
        protocol: resolve(__dirname, './src/protocol.ts'),
      },
      name: 'OidcServiceWorker',
      formats: ['es'],
      // the proper extensions will be added
      fileName: format => `[name].${format === 'es' ? 'js' : format}`,
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
});
