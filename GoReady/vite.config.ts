import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: forward /api to the backend (backend/ — `npm run dev` there, port 4000)
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
