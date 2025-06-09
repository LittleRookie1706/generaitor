import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// import { resolve } from 'path' // No longer needed for input path
import { fileURLToPath, URL } from "node:url"; // Import URL for path resolution

// https://vite.dev/config/
export default defineConfig({
  
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        // Define the content script as the entry point using import.meta.url
        index: fileURLToPath(new URL('./index.html', import.meta.url))
      },
      output: {
        // Ensure output filenames match manifest.json
        entryFileNames: `[name].js`, // Outputs content.js
        chunkFileNames: `assets/[name].js`,
        assetFileNames: (assetInfo) => {
          // Force CSS file name to match manifest.json
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css';
          }
          // Keep default naming for other assets
          return `assets/[name][extname]`;
        },
        // manualChunks(id) {
        //   if (id.includes('node_modules')) {
        //     return 'vendor';
        //   }
        //   // Create a separate chunk for domUtils
        //   if (id.includes('src/utils/domUtils.js')) {
        //     return 'dom-utils';
        //   }
        // }
      },
    },
    // Ensure the output directory is 'dist' and it's cleared before build
    outDir: "dist",
    emptyOutDir: true,
  },
});
