import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'user.index.html'),
        admin: resolve(__dirname, 'admin.index.html'),
      },
    },
  },
});
