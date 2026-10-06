import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the built app works from any folder, a file server, or Capacitor's webview.
export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["art/app-icon-192.png", "art/app-icon-512.png"],
      manifest: {
        name: "SCC Chess School",
        short_name: "Chess School",
        description: "Learn chess step by step, in Punjabi and English.",
        lang: "pa",
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: "./",
        icons: [
          { src: "art/app-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "art/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // the Stockfish .wasm (1.7 MB) must be cached too, or bots, Game Review, the analysis board and the
        // endgame drills fail offline (full check 2026-10-05); Workbox skips files over 2 MiB unless told
        globPatterns: ["**/*.{js,css,html,svg,woff2,json,webp,png,wasm}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // not shipped offline: the withdrawn Chidi art with a patka (#49; coach.ts draws the bird until R4 art
        // arrives) and the phulkari texture no screen uses any more
        globIgnores: ["**/art/coach/young-*", "**/art/tex-phulkari.webp", "**/puzzles/bank/**", "**/explorer/**"],
        // coach-voice clips (DECISIONS #80) are not precached (hundreds of files); each is kept once it has been heard
        runtimeCaching: [
          { urlPattern: /\/audio\/.+\.mp3$/, handler: "CacheFirst", options: { cacheName: "coach-voice", expiration: { maxEntries: 1500 } } },
          // DECISIONS #85: the big puzzle bank (22 bands, ~4.8 MB in all) and the opening explorer are fetched when
          // first opened and kept, so they work offline after that without making every install download them
          { urlPattern: /\/puzzles\/bank\/.+\.(txt|json)$/, handler: "StaleWhileRevalidate", options: { cacheName: "puzzle-bank", expiration: { maxEntries: 40 } } },
          { urlPattern: /\/explorer\/.+\.json$/, handler: "StaleWhileRevalidate", options: { cacheName: "explorer", expiration: { maxEntries: 4 } } },
        ],
        // design-trial pages sit beside the app in previews; the offline fallback must not swallow them
        navigateFallbackDenylist: [/-options\.html$/, /trial/],
      },
    }),
  ],
  // three chunks instead of one 750KB file: libraries, lesson content (changes often), and the app itself,
  // so an update to a lesson doesn't make every learner re-download the libraries
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) return "vendor";
          if (id.includes("/src/content/")) return "content";
        },
      },
    },
  },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
