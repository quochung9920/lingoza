import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: "./src",
  base: "",
  plugins: [zaloMiniApp(), react()],
  build: {
    assetsInlineLimit: 0
  },
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  }
});
