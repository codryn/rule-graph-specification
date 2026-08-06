import { describe, expect, it } from "vitest";
import type { Bundle } from "@codryn/crgs-core";
import { buildRuntimeGraph } from "@codryn/crgs-runtime";
import { bundledExample, bundledSchemas } from "../src/loaders/bundled-data";
import {
  adaptRuntimeGraph,
  buildEntitySummaries,
  filterEntities,
  findDependencyPath,
  loadViewerDocument,
  localizedLabel,
  parseJsonDocument
} from "../src/services/viewer-service";

describe("viewer service", () => {
  it("uses selected, profile, default, and ID localization fallbacks", () => {
    const label = {
      default: "Default",
      translations: { de: "Deutsch", fr: "Francais" }
    };
    expect(localizedLabel(label, "de", "fr", "id")).toBe("Deutsch");
    expect(localizedLabel(label, "it", "fr", "id")).toBe("Francais");
    expect(localizedLabel(label, "it", undefined, "id")).toBe("Default");
    expect(localizedLabel(undefined, "it", undefined, "id")).toBe("id");
  });

  it("filters entities by search and structural flags", () => {
    const document = loadViewerDocument(bundledExample, bundledSchemas);
    const summaries = buildEntitySummaries(document, "en");
    const result = filterEntities(summaries, {
      search: "battle",
      type: "",
      namespace: "example",
      flags: new Set(["prerequisites"])
    });
    expect(result.map((item) => item.entity.id)).toEqual([
      "example.ability.battle-mage"
    ]);
  });

  it("converts runtime nodes and edges deterministically", () => {
    const graph = adaptRuntimeGraph(
      bundledExample,
      buildRuntimeGraph(bundledExample)
    );
    expect(
      graph.nodes.find((node) => node.id === "example.ability.battle-mage")
        ?.label
    ).toBe("Battle Mage");
    expect(graph.nodes.some((node) => node.kind === "virtual-threshold")).toBe(
      true
    );
    expect(
      graph.edges.some(
        (edge) =>
          edge.category === "prerequisite" &&
          edge.target === "example.ability.battle-mage"
      )
    ).toBe(true);
    expect(
      graph.edges.some(
        (edge) => edge.category === "relationship" && edge.origin === "explicit"
      )
    ).toBe(true);
  });

  it("finds and highlights a shortest dependency path", () => {
    const graph = adaptRuntimeGraph(
      bundledExample,
      buildRuntimeGraph(bundledExample)
    );
    const path = findDependencyPath(
      graph,
      "example.ability.powerful-strike",
      "example.ability.battle-mage"
    );
    expect(path.found).toBe(true);
    expect(path.nodeIds).toEqual([
      "example.ability.powerful-strike",
      "example.ability.battle-mage"
    ]);
    expect(path.edgeIds).toHaveLength(1);
  });

  it("reports malformed files with an actionable message", () => {
    expect(() => parseJsonDocument("{ nope")).toThrow("Malformed JSON");
    expect(() => loadViewerDocument([], bundledSchemas)).toThrow(
      "not a CRGS bundle"
    );
  });

  it("keeps unresolved and duplicate entities visible with resolver error codes", () => {
    const invalid = structuredClone(bundledExample) as Bundle;
    invalid.entities.push(structuredClone(invalid.entities[0]));
    const battleMage = invalid.entities.find(
      (entity) => entity.id === "example.ability.battle-mage"
    )!;
    battleMage.requirements = {
      kind: "crgs.requirement.entity",
      targetId: "example.ability.missing"
    };
    const document = loadViewerDocument(invalid, bundledSchemas);
    expect(document.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ENTITY_ID",
        "INVALID_REQUIREMENT_TARGET"
      ])
    );
    expect(
      document.graph.nodes.some(
        (node) =>
          node.id === "example.ability.missing" && node.status === "unresolved"
      )
    ).toBe(true);
  });

  it("uses runtime cycle diagnostics without crashing", () => {
    const cyclic = structuredClone(bundledExample) as Bundle;
    cyclic.entities.find(
      (entity) => entity.id === "example.ability.powerful-strike"
    )!.requirements = {
      kind: "crgs.requirement.entity",
      targetId: "example.ability.battle-mage"
    };
    const document = loadViewerDocument(cyclic, bundledSchemas);
    expect(
      document.diagnostics.some((item) => item.code === "CRGS_GRAPH_CYCLE")
    ).toBe(true);
    expect(document.graph.cycles.length).toBeGreaterThan(0);
  });
});
