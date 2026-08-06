import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@codryn/crgs-core": resolve(
        import.meta.dirname,
        "packages/crgs-core/src/index.ts"
      ),
      "@codryn/crgs-runtime": resolve(
        import.meta.dirname,
        "packages/crgs-runtime/src/index.ts"
      ),
      "@codryn/crgs-schema": resolve(
        import.meta.dirname,
        "packages/crgs-schema/src/index.ts"
      ),
      "@codryn/crgs-validator/browser": resolve(
        import.meta.dirname,
        "packages/crgs-validator/src/browser.ts"
      ),
      "@codryn/crgs-validator": resolve(
        import.meta.dirname,
        "packages/crgs-validator/src/index.ts"
      ),
      "@codryn/crgs-viewer": resolve(
        import.meta.dirname,
        "packages/crgs-viewer/src/index.ts"
      )
    }
  }
});
