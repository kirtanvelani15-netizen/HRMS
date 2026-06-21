import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const httpsConfig = (() => {
  try {
    return {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    };
  } catch {
    return undefined;
  }
})();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-html-fallback',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || '/';
          const acceptsHtml = req.headers.accept?.includes('text/html');

          if (
            req.method === 'GET' &&
            acceptsHtml &&
            !url.startsWith('/api') &&
            !url.startsWith('/uploads') &&
            !url.includes('.')
          ) {
            req.url = '/index.html';
          }

          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    // https: httpsConfig,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
