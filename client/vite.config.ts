import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      // ✅ ensure these are included in build output (if you have them)
      includeAssets: ['sharif-campus.geojson', 'pwa-192.png', 'pwa-512.png'],

      manifest: {
        name: 'Campus Lost & Found',
        short_name: 'Lost&Found',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1f3a',
        theme_color: '#0b1f3a',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },

      workbox: {
        runtimeCaching: [
          // ✅ Cache OpenStreetMap tiles (offline after first load)
          {
            urlPattern: ({ url }) =>
              url.origin === "https://tile.openstreetmap.org" ||
              url.origin === "https://a.tile.openstreetmap.org" ||
              url.origin === "https://b.tile.openstreetmap.org" ||
              url.origin === "https://c.tile.openstreetmap.org",
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ Cache campus geojson
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/sharif-campus.geojson'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'campus-geojson',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ✅ Optional: cache items/tags API GETs (helps map & list when offline)
          // If your API is on another origin (e.g. http://localhost:3000),
          // this still works because it matches by pathname.
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/items') || url.pathname.startsWith('/tags')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});