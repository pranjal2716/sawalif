import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/sawalif/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Sawalif - Gulf Arabic by ear',
        short_name: 'Sawalif',
        description: 'Daily spoken Gulf Arabic practice: audio flashcards, listening, speaking and progress.',
        theme_color: '#0b1224',
        background_color: '#0b1224',
        display: 'standalone',
        start_url: '/sawalif/#/today',
        scope: '/sawalif/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: { cacheName: 'sawalif-audio', expiration: { maxEntries: 5000 } }
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/audio/index.json') || url.pathname.endsWith('/content/course.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'sawalif-data' }
          }
        ]
      }
    })
  ]
});
