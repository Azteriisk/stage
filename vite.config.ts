import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("/node_modules/@strudel/web/") !== -1) {
            return "strudel-web";
          }

          if (id.indexOf("/node_modules/@strudel/") !== -1) {
            return "strudel-core";
          }

          if (
            id.indexOf("/node_modules/@codemirror/") !== -1 ||
            id.indexOf("/node_modules/codemirror/") !== -1
          ) {
            return "codemirror";
          }

          if (
            id.indexOf("/node_modules/react/") !== -1 ||
            id.indexOf("/node_modules/react-dom/") !== -1
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
