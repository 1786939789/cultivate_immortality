import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const apiPort = process.env.API_PORT || process.env.PORT || "8787";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
