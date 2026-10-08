import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: true,
    // Vite handles OPTIONS before proxying. Cached native assets send If-None-Match,
    // so their WebView origins must pass this preflight as well as the API CORS.
    cors: {
      origin: [
        /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
      ],
    },
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
    fs: {
      strict: false,
    },
  },
});
