import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url))
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          return `assets/[name][extname]`;
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
