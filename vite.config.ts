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
        description: 'A modern library management app built with SvelteKit, IndexedDB, and DaisyUI. Track your manhwa, manga, novels, and more with rich metadata, offline support, and powerful search capabilities.',
        start_url: '/lib/',
        scope: '/lib/',
        display: 'standalone',
        icons: [
          {
            src: '/lib/img192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/lib/img512.png',
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