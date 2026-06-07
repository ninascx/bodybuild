import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'LiftLog',
        short_name: 'LiftLog',
        description: '本地优先的个人训练记录工具',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        categories: ['health', 'fitness', 'lifestyle'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 安装新 SW 后立刻激活并接管页面，避免因为旧 SW 缓存指向已经不存在的资源指纹导致白屏
        clientsClaim: true,
        skipWaiting: true,
        // 删除旧版本预缓存
        cleanupOutdatedCaches: true,
        // 多用户网站里的 /api/* 都可能包含个人数据，不能进入 Service Worker 缓存。
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching for better offline experience
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false, // dev 不启用，避免缓存干扰开发
      },
    }),
  ],
  server: {
    watch: {
      ignored: ['**/data/**'],
    },
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React vendor - rarely changes
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }

          // Chart library - only loaded on Dashboard
          if (id.includes('node_modules/recharts')) {
            return 'chart-vendor'
          }

          // Core utilities - relatively stable
          if (id.includes('src/lib/metrics') ||
              id.includes('src/lib/storage') ||
              id.includes('src/lib/workout') ||
              id.includes('src/lib/exportPayload')) {
            return 'utils'
          }
        }
      }
    },
    // Increase chunk size warning limit for chart vendor
    chunkSizeWarningLimit: 600
  }
})
