import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// AnalogMeter — Vite + React + PWA
// base는 GitHub Pages 배포 경로(noveler17/analog-meter)를 따른다.
export default defineConfig({
  base: '/analog-meter/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'AnalogMeter',
        short_name: 'AnalogMeter',
        description: '전문 사진가를 위한 PWA 노출계',
        // 디자인 토큰과 일치: 배경=BG_BLACK, 테마=CLOVER_GREEN
        theme_color: '#00FF41',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/analog-meter/',
        scope: '/analog-meter/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
})
