import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Vouch — Audit Operations Platform',
        short_name: 'Vouch',
        description:
          'B2B audit operations & workforce platform — manage companies, projects, field auditors, and payouts.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0A0E16',
        theme_color: '#0A0E16',
        orientation: 'any',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Same intent as the original hand-rolled sw.js: navigations get a
        // network-first strategy so a stale cached shell can never outrun a
        // real deploy, everything else built by Vite (JS/CSS chunks, which
        // are already content-hashed so they're safe to cache aggressively)
        // is precached and served cache-first, and third-party runtime
        // requests (OSM tiles for Leaflet, Google Fonts) get their own
        // stale-while-revalidate/cache-first rules.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'vouch-pages', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'vouch-fonts' },
          },
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vouch-map-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
