import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig(() => {
  const isElectron = process.env.ELECTRON === 'true';

  return {
    plugins: [
      react(),
      isElectron && electron({
        main: {
          entry: 'electron/main.ts',
        },
        preload: {
          input: 'electron/preload.ts',
        },
        // We remove 'renderer: {}' because your React frontend is perfectly fine 
        // as a standard web application, and we don't need to inject Node.js into it.
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
          timeout: 1200000,
          proxyTimeout: 1200000,
          configure: (proxy) => {
            // Suppress ECONNREFUSED spam in the terminal when backend isn't running.
            // Instead of a crash log, return a clean 503 so the frontend can
            // detect "backend offline" and fall back to demo data gracefully.
            proxy.on('error', (err, _req, res) => {
              if ((err as any).code === 'ECONNREFUSED') {
                // Only log once per session, not for every request
                if (!(proxy as any).__offlineLogged) {
                  console.warn('[vite proxy] Backend offline (ECONNREFUSED) — returning 503 to client');
                  (proxy as any).__offlineLogged = true;
                }
              }
              if (res && 'writeHead' in res && !(res as any).writableEnded) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ offline: true, message: 'Backend not running' }));
              }
            });
          },
        },
      },
    },
  };
})
