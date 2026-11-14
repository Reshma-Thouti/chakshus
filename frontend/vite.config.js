import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * vite.config.js
 *
 * Key setting — the proxy:
 *   All requests from React to /api/* are proxied to the Express backend
 *   running on port 5000. This avoids CORS issues during local development.
 *   In production, a reverse proxy (Nginx) handles this instead.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
