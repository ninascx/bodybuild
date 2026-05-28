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
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '减脂增肌追踪',
        short_name: '健身追踪',
        description: '本地优先的个人减脂增肌追踪工具',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
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
})
