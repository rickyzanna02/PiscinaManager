import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Piscina Manager',
        short_name: 'Piscina',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
    


  ],

  server: {
  https: true,
  host: true,
  proxy: {
    '/api': {
      target: 'http://192.168.1.131:8000',
      changeOrigin: true,
      secure: false,
    }
  }
}

})
