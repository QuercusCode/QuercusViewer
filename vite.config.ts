import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo/icon-black.png', 'logo/icon-white.png'],
      manifest: {
        name: 'Quercus Viewer',
        short_name: 'Quercus',
        description: 'Professional 3D Protein & Chemical structure viewer',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          {
            src: 'logo/icon-white.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo/icon-black.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MiB to accommodate large Mol* chunks
      }
    })
  ],
  base: '/',
})
