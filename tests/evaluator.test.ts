import {
  evaluate,
  resolveBundle,
  type Bundle,
  type CustomRequirementExpression,
  type EvaluationContext
} from "../packages/crgs-core/src/index.js";
import { describe, expect, it } from "vitest";

function createBundle(): Bundle {
  return {
    specVersion: "0.2.0",
    manifest: {
      id: "example-rpg.advanced",
      title: "Example RPG Advanced Bundle",
      datasetVersion: "0.2.0"
    },
    profile: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.2.0",
      specVersion: "0.2.0",
      extensions: {
        entityTypes: [
          {
            id: "example.entity.trait",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.2/entities/trait.schema.json"
          }
        ],
        requirementTypes: [
          {
            id: "example.requirement.attribute-rating",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.2/requirements/attribute-rating.schema.json"
          }
        ],
        effectTypes: [],
        relationTypes: []
      }
    },
    entities: [
      {
        id: "ancestry.human",
        type: "example.entity.trait",
        label: { default: "Human" }
      },
      {
        id: "background.scholar",
        type: "example.entity.trait",
        label: { default: "Scholar" }
      }
    ],
    relationships: []
  };
}

describe("evaluate", () => {
  it("explains a satisfied core fact requirement", () => {
    const result = evaluate(
      {
        kind: "fact",
        fact: "selected:ancestry",
        operator: "equals",
        value: "ancestry.human"
      },
      {
        facts: {
          "selected:ancestry": "ancestry.human"
        }
      }
    );

    expect(result).toEqual({
      satisfied: true,
      evaluated: [
        {
          requirement: "crgs.requirement.fact",
          fact: "selected:ancestry",
          operator: "equals",
          actualValue: "ancestry.human",
          expectedValue: "ancestry.human",
          satisfied: true
        }
      ],
      missing: []
    });
  });

  it("explains grouped evaluation with missing facts", () => {
    const result = evaluate(
      {
        kind: "group",
        mode: "all",
        children: [
          {
            kind: "fact",
            fact: "selected:ancestry",
            operator: "equals",
            value: "ancestry.human"
          },
          {
            kind: "fact",
            fact: "profile:demo-mode",
            operator: "present"
          }
        ]
      },
      {
        facts: {
          "selected:ancestry": "ancestry.human"
        }
      }
    );

    expect(result.satisfied).toBe(false);
    expect(result.evaluated).toHaveLength(2);
    expect(result.missing).toEqual([{ fact: "profile:demo-mode" }]);
  });

  it("supports explainable entity requirements", () => {
    const resolved = resolveBundle(createBundle());

    const result = evaluate(
      {
        kind: "crgs.requirement.entity",
        targetId: "example.ability.arcane-training"
      },
      {
        entityIndex: resolved.index,
        entityIds: ["ancestry.human"]
      }
    );

    expect(result).toEqual({
      satisfied: false,
      evaluated: [
        {
          requirement: "crgs.requirement.entity",
          targetId: "example.ability.arcane-training",
          satisfied: false
        }
      ],
      missing: [
        {
          entityId: "example.ability.arcane-training"
        }
      ]
    });
  });

  it("requires the subject to own an entity requirement target", () => {
    const resolved = resolveBundle(createBundle());

    const result = evaluate(
      {
        kind: "crgs.requirement.entity",
        targetId: "background.scholar"
      },
      {
        entityIndex: resolved.index,
        entityIds: ["ancestry.human"]
      }
    );

    expect(result).toEqual({
      satisfied: false,
      evaluated: [
        {
          requirement: "crgs.requirement.entity",
          targetId: "background.scholar",
          satisfied: false
        }
      ],
      missing: [
        {
          entityId: "background.scholar"
        }
      ]
    });
  });

  it("delegates profile-defined requirement kinds to custom evaluators", () => {
    const expression: CustomRequirementExpression = {
      kind: "example.requirement.attribute-rating",
      attribute: "intelligence",
      minimum: 14
    };
    const context: EvaluationContext = {
      requirementEvaluators: {
        "example.requirement.attribute-rating": (customExpression) => ({
          satisfied: true,
          evaluated: [
            {
              requirement: customExpression.kind,
              satisfied: true
            }
          ],
          missing: []
        })
      }
    };

    const result = evaluate(expression, context);

    expect(result).toEqual({
      satisfied: true,
      evaluated: [
        {
          requirement: "example.requirement.attribute-rating",
          satisfied: true
        }
      ],
      missing: []
    });
  });
});
