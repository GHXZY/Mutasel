import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  base: "./",
  build: { assetsInlineLimit: 0 },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
