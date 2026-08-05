import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("schema validation", () => {
  it("accepts the shipped example artifacts", () => {
    const stdout = execFileSync(
      "node",
      [resolve(__dirname, "..", "tools", "validate-schemas.mjs")],
      {
        cwd: resolve(__dirname, ".."),
        encoding: "utf8"
      }
    );

    expect(stdout).toContain("Schema valid example accepted: Entity");
    expect(stdout).toContain("Schema invalid example rejected: Bundle");
    expect(stdout).toContain("Schema valid example accepted: ProfileManifest");
    expect(stdout).toContain("Validated: Example profile");
    expect(stdout).toContain("Validated: Minimal example bundle");
    expect(stdout).toContain("Validated: Advanced example bundle");
    expect(stdout).toContain("Validated: Example profile demonstration bundle");
  });
});
