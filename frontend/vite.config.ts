import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: [
        '43a5-87-120-93-181.ngrok-free.app' // Разрешаем конкретно этот хост ngrok
      ],
      proxy: {
        '/api': {
          target: 'http://backend:4002',
          changeOrigin: true,
        },
      },
    },
  };
});
