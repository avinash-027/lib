import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
  	tailwindcss(), 
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true }, // allows testing in dev
      strategies: 'generateSW', // or 'injectManifest' for custom SW
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'Lib',
        short_name: 'content-lib',
        description: 'A description of your app',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/img192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/img512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Additional service worker options if needed
        globPatterns: ['**/*.{js,css,png,jpg,svg}'],
      },
    }),
  ]
});