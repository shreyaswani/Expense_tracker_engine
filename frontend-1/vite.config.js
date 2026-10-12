import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Keep if you use @tailwindcss/vite, remove if using PostCSS
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache all compiled JS, CSS, HTML, and icons so the app opens 100% offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
      manifest: {
        name: 'Shreyas Finance Tracker',
        short_name: 'Finance',
        description: 'Offline-first personal finance and split engine',
        theme_color: '#0f111a',
        background_color: '#0f111a',
        display: 'standalone',
        start_url: '/',
      }
    })
  ],
});
