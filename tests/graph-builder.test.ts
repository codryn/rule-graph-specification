import { type Bundle } from "../packages/crgs-core/src/index.js";
import { buildRuntimeGraph } from "../packages/crgs-runtime/src/index.js";
import { describe, expect, it } from "vitest";

function createBundle(): Bundle {
  return {
    specVersion: "0.1.0",
    manifest: {
      id: "example-rpg.graph",
      title: "Example RPG Graph Bundle",
      datasetVersion: "0.1.0"
    },
    profile: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.1.0",
      specVersion: "0.1.0",
      extensions: {
        entityTypes: [
          {
            id: "example.entity.ability",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/ability.schema.json"
          }
        ],
        requirementTypes: [
          {
            id: "example.requirement.attribute-rating",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/requirements/attribute-rating.schema.json"
          }
        ],
        effectTypes: [],
        relationTypes: []
      }
    },
    entities: [
      {
        id: "example.ability.arcane-training",
        type: "example.entity.ability",
        label: {
          default: "Arcane Training"
        }
      },
      {
        id: "example.ability.powerful-strike",
        type: "example.entity.ability",
        label: {
          default: "Powerful Strike"
        },
        requirements: {
          kind: "group",
          mode: "all",
          children: [
            {
              kind: "fact",
              fact: "selected:ability",
              operator: "equals",
              value: "example.ability.arcane-training"
            },
            {
              kind: "fact",
              fact: "attribute:strength",
              operator: "atLeast",
              value: 3
            }
          ]
        }
      }
    ],
    relationships: []
  };
}

describe("buildRuntimeGraph", () => {
  it("builds deterministic entity and threshold dependency edges", () => {
    const bundle = createBundle();

    const graph = buildRuntimeGraph(bundle);
    const graphAgain = buildRuntimeGraph(bundle);

    expect(JSON.stringify(graph)).toBe(JSON.stringify(graphAgain));
    expect(graph.nodes).toEqual([
      {
        id: "example.ability.arcane-training",
        kind: "entity",
        entityType: "example.entity.ability"
      },
      {
        id: "example.ability.powerful-strike",
        kind: "entity",
        entityType: "example.entity.ability"
      },
      {
        id: "virtual.attribute.strength.gte.3",
        kind: "virtual-threshold",
        fact: "attribute:strength",
        operator: "atLeast",
        value: 3
      }
    ]);
    expect(graph.edges).toEqual([
      {
        id: "required-by:example.ability.powerful-strike:example.ability.arcane-training",
        source: "example.ability.powerful-strike",
        target: "example.ability.arcane-training",
        type: "required-by"
      },
      {
        id: "required-by:example.ability.powerful-strike:virtual.attribute.strength.gte.3",
        source: "example.ability.powerful-strike",
        target: "virtual.attribute.strength.gte.3",
        type: "required-by"
      },
      {
        id: "requires:example.ability.arcane-training:example.ability.powerful-strike",
        source: "example.ability.arcane-training",
        target: "example.ability.powerful-strike",
        type: "requires"
      },
      {
        id: "requires:virtual.attribute.strength.gte.3:example.ability.powerful-strike",
        source: "virtual.attribute.strength.gte.3",
        target: "example.ability.powerful-strike",
        type: "requires"
      }
    ]);
    expect(graph.cycles).toEqual([]);
  });

  it("detects deterministic cycles between entities", () => {
    const bundle = createBundle();
    bundle.entities[0] = {
      ...bundle.entities[0],
      requirements: {
        kind: "crgs.requirement.entity",
        targetId: "example.ability.powerful-strike"
      }
    };

    const graph = buildRuntimeGraph(bundle);

    expect(graph.cycles).toEqual([
      {
        nodeIds: [
          "example.ability.arcane-training",
          "example.ability.powerful-strike"
        ],
        edgeIds: [
          "requires:example.ability.arcane-training:example.ability.powerful-strike",
          "requires:example.ability.powerful-strike:example.ability.arcane-training"
        ]
      }
    ]);
  });
});
