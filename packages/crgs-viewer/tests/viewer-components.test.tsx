// @vitest-environment jsdom

import "./setup";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Bundle } from "@codryn/crgs-core";
import {
  bundledExample,
  bundledSchemas,
  bundledSubject
} from "../src/loaders/bundled-data";
import {
  evaluateEntity,
  loadViewerDocument
} from "../src/services/viewer-service";
import { EntityInspector } from "../src/components/EntityInspector";
import { EvaluationPanel } from "../src/components/EvaluationPanel";
import { RequirementTree } from "../src/components/RequirementTree";

describe("viewer components", () => {
  it("renders nested prerequisite operators without flattening", () => {
    const expression = {
      kind: "group",
      mode: "all",
      children: [
        {
          kind: "group",
          mode: "any",
          children: [
            { kind: "fact", fact: "level", operator: "atLeast", value: 5 }
          ]
        }
      ]
    } as const;
    render(<RequirementTree expression={expression} />);
    expect(screen.getByText("All of")).toBeInTheDocument();
    expect(screen.getByText("Any of")).toBeInTheDocument();
    expect(screen.getByText("level >= 5")).toBeInTheDocument();
  });

  it("shows selected Battle Mage identity and direct/transitive dependencies", () => {
    const document = loadViewerDocument(bundledExample, bundledSchemas);
    const entity = document.bundle.entities.find(
      (item) => item.id === "example.ability.battle-mage"
    )!;
    const node = document.graph.nodes.find((item) => item.id === entity.id);
    render(
      <EntityInspector
        bundle={document.bundle}
        graph={document.graph}
        entity={entity}
        node={node}
        language="en"
        onSelect={() => undefined}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Battle Mage" })
    ).toBeInTheDocument();
    expect(screen.getByText("All of")).toBeInTheDocument();
    expect(
      screen.getAllByText("example.ability.powerful-strike").length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Transitive prerequisites")).toBeInTheDocument();
  });

  it("displays passed and failed subject requirements", () => {
    const bundle = structuredClone(bundledExample) as Bundle;
    const entity = bundle.entities.find(
      (item) => item.id === "example.ability.battle-mage"
    )!;
    const subject = {
      ...bundledSubject,
      entityIds: ["example.ability.powerful-strike"],
      facts: { "character:level": 5 }
    };
    const evaluation = {
      entityId: entity.id,
      result: evaluateEntity(bundle, entity, subject)
    };
    render(
      <EvaluationPanel
        entity={entity}
        subject={subject}
        evaluation={evaluation}
        onEvaluate={() => undefined}
        onSelect={() => undefined}
      />
    );
    expect(screen.getByText(/Not satisfied/)).toBeInTheDocument();
    expect(screen.getAllByText("PASS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FAIL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("example.ability.arcane-training")).toHaveLength(
      2
    );
  });

  it("allows inspector dependency selection", () => {
    const document = loadViewerDocument(bundledExample, bundledSchemas);
    const entity = document.bundle.entities.find(
      (item) => item.id === "example.ability.battle-mage"
    )!;
    let selected = "";
    render(
      <EntityInspector
        bundle={document.bundle}
        graph={document.graph}
        entity={entity}
        language="en"
        onSelect={(id) => {
          selected = id;
        }}
      />
    );
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "example.ability.powerful-strike"
      })[0]
    );
    expect(selected).toBe("example.ability.powerful-strike");
  });
});
