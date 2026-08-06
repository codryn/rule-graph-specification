import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("cytoscape-elk") || id.includes("elkjs")) {
              return "elk-vendor";
            }

            if (id.includes("cytoscape")) {
              return "cytoscape-vendor";
            }

            if (
              id.includes("react") ||
              id.includes("scheduler") ||
              id.includes("lucide-react")
            ) {
              return "ui-vendor";
            }

            if (id.includes("ajv") || id.includes("fast-deep-equal")) {
              return "validation-vendor";
            }
          }

          return undefined;
        }
      }
    }
  },
  server: {
    fs: {
      allow: ["../.."]
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  }
});
