import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.woff2', 'icons/*.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Очаг',
        short_name: 'Очаг',
        description: 'Семейный бюджет для двоих',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1E5C46',
        background_color: '#F2F1EC',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        runtimeCaching: [],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8088',
    },
  },
});
