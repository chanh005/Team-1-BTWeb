import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served under /admin/ so it can be reverse-proxied onto the same origin as
  // GoReady (the user site) for shared localStorage — see GoReady/vite.config.ts.
  base: '/admin/',
  server: {
    port: 5184,
  },
});
