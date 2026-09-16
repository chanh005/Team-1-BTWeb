import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    // Reverse-proxy the Admin app (GoReady-Admin, dev port 5184) under /admin
    // so both apps run on the same origin and share localStorage for live sync.
    proxy: {
      '/admin': {
        target: 'http://localhost:5184',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
