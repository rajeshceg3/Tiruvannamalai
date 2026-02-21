import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sacred Steps',
        short_name: 'Sacred Steps',
        description: 'A pilgrimage journey companion.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
             urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
             handler: 'CacheFirst',
             options: {
               cacheName: 'unsplash-images',
               expiration: {
                 maxEntries: 50,
                 maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
          },
          {
             urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
             handler: 'CacheFirst',
             options: {
               cacheName: 'osm-tiles',
               expiration: {
                 maxEntries: 100,
                 maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
          }
        ]
      }
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
