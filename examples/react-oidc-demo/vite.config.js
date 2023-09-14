import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'], //possibly needed due to duplicates from monorepo. supposedly plugin-react already does this? https://github.com/vitejs/vite/issues/8378
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  server: {
    headers: {
     // "Content-Security-Policy": "script-src 'self' 'unsafe-inline';",
    },
  },
});
