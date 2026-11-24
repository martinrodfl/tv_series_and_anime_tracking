import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vitest/config'

// Despliegue previsto: GitHub Pages en https://<usuario>.github.io/tv_series_and_anime_tracking/.
// En desarrollo la app vive en «/». Para otro hosting: BASE_PATH=/ pnpm build
const DEFAULT_PRODUCTION_BASE = '/tv_series_and_anime_tracking/'

function normalizeBase(value: string): string {
  return `/${value.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/')
}

// GitHub Pages no sabe de rutas del cliente: sirve 404.html en cualquier ruta desconocida.
// Con una copia de index.html, un enlace directo como /library carga la app y el router resuelve la ruta.
function spaFallback404(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => {
  // `vite preview` sirve el build de producción, así que usa la misma base que `vite build`.
  const isProductionBuild = command === 'build' || isPreview === true
  const base = normalizeBase(process.env.BASE_PATH ?? (isProductionBuild ? DEFAULT_PRODUCTION_BASE : '/'))

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        disable: process.env.VITEST === 'true',
        registerType: 'autoUpdate',
        manifest: {
          id: base,
          name: 'Anime Tracker',
          short_name: 'Anime Tracker',
          description: 'Seguimiento personal de anime: tu biblioteca y tu progreso se guardan en tu dispositivo.',
          lang: 'es',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#121212',
          theme_color: '#121212',
          icons: [
            { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Recursos de la aplicación: se guardan todos para que funcione sin conexión.
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          // 404.html es solo para GitHub Pages; el SVG maskable es la fuente de los PNG y no se usa en ejecución.
          globIgnores: ['**/404.html', 'icons/icon-maskable.svg'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Solo portadas de AniList (https). La API GraphQL no se cachea: es POST y siempre va a la red.
              urlPattern: ({ request, url }) =>
                request.destination === 'image' && url.protocol === 'https:' && url.hostname.endsWith('.anilist.co'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'anilist-covers',
                // Se exige CORS en la imagen (crossOrigin) para no guardar respuestas opacas, que ocupan mucha cuota.
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
                // El CDN no envía `Vary: Origin`: una portada cargada antes sin CORS quedó en la caché HTTP sin
                // cabeceras CORS y el navegador la reutilizaría y la bloquearía. Solo va a la red si no está en esta caché.
                fetchOptions: { cache: 'reload' },
              },
            },
          ],
        },
      }),
      spaFallback404(),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
