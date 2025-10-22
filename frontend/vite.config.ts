import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "fs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    https: {
      key: readFileSync(path.resolve(__dirname, "ssl/key.pem")),
      cert: readFileSync(path.resolve(__dirname, "ssl/cert.pem")),
    },
    port: 5173,
    host: "0.0.0.0",
  },
});
