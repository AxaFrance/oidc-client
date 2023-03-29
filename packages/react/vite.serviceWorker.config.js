import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({
    insertTypesEntry: true,
  })],
  test: {
    coverage: {
        provider: 'c8'
    }
  },
  build: {
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, './service_worker/OidcServiceWorker.ts'),
      name: 'OidcServiceWorker',
      formats: ['cjs'],
      // the proper extensions will be added
      fileName: 'OidcServiceWorker',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      //   external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          //   vue: 'Vue',
        },
      },
    },
  },
});
