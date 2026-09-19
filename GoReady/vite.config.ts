import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Dev-only: Vite's dev server only resolves "/admin/" to admin/index.html,
// not "/admin" (no trailing slash) — the latter falls through to the main
// app's index.html instead. Redirect so typing either URL lands on the
// admin app, matching how Vercel serves the built output in production.
function redirectAdminTrailingSlash(): Plugin {
  return {
    name: 'redirect-admin-trailing-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin') {
          res.statusCode = 302;
          res.setHeader('Location', '/admin/');
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), redirectAdminTrailingSlash()],
  server: {
    port: 5183,
    // Local dev only: forwards /api/* to the local Express server (backend/)
    // so the frontend can call relative "/api/..." paths everywhere, matching
    // how it works on Vercel (same-origin serverless functions under /api).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
});
