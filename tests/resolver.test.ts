import {
  BundleResolutionError,
  type Bundle,
  resolveBundle
} from "../packages/crgs-core/src/index.js";
import { describe, expect, it } from "vitest";

function createBundle(): Bundle {
  return {
    specVersion: "0.1.0",
    manifest: {
      id: "example-rpg.minimal",
      title: "Example RPG Minimal Bundle",
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
            id: "example.entity.trait",
            schema: "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json"
          }
        ],
        requirementTypes: [
          {
            id: "example.requirement.attribute-rating",
            schema: "https://schemas.codryn.com/crgs/profiles/example/v0.1/requirements/attribute-rating.schema.json"
          }
        ],
        effectTypes: [
          {
            id: "example.effect.grant",
            schema: "https://schemas.codryn.com/crgs/profiles/example/v0.1/effects/grant.schema.json"
          }
        ],
        relationTypes: [
          {
            id: "example.relation.grants",
            schema: "https://schemas.codryn.com/crgs/profiles/example/v0.1/relations/grants.schema.json"
          }
        ]
      }
    },
    entities: [
      {
        id: "ancestry.human",
        type: "example.entity.trait",
        label: {
          default: "Human"
        }
      },
      {
        id: "feature.adaptable",
        type: "example.entity.trait",
        label: {
          default: "Adaptable"
        },
        requirements: {
          kind: "fact",
          fact: "selected:ancestry",
          operator: "equals",
          value: "ancestry.human"
        },
        effects: [
          {
            type: "example.effect.grant",
            target: "capability.extra-choice",
            operation: "grant",
            value: true
          }
        ]
      }
    ],
    relationships: [
      {
        id: "rel.human-grants-adaptable",
        type: "example.relation.grants",
        from: "ancestry.human",
        to: "feature.adaptable"
      }
    ]
  };
}

describe("resolveBundle", () => {
  it("builds an entity index for a valid bundle", () => {
    const resolved = resolveBundle(createBundle());

    expect(resolved.index.byId.get("ancestry.human")?.label.default).toBe("Human");
    expect(resolved.index.outgoingRelations.get("ancestry.human")).toHaveLength(1);
    expect(resolved.index.incomingRelations.get("feature.adaptable")).toHaveLength(1);
  });

  it("rejects duplicate entity ids", () => {
    const bundle = createBundle();
    bundle.entities.push({
      id: "ancestry.human",
      type: "example.entity.trait",
      label: {
        default: "Duplicate Human"
      }
    });

    expectResolverIssue(bundle, "DUPLICATE_ENTITY_ID", "/entities/2/id");
  });

  it("rejects unknown referenced entities", () => {
    const bundle = createBundle();
    bundle.relationships[0] = {
      ...bundle.relationships[0],
      from: "ancestry.unknown"
    };

    expectResolverIssue(bundle, "UNKNOWN_REFERENCED_ENTITY", "/relationships/0/from");
  });

  it("rejects invalid profile namespaces", () => {
    const bundle = createBundle();
    bundle.entities[0] = {
      ...bundle.entities[0],
      type: "other.entity.trait"
    };

    expectResolverIssue(bundle, "INVALID_PROFILE_NAMESPACE", "/entities/0/type");
  });

  it("rejects unsupported requirement types", () => {
    const bundle = createBundle();
    bundle.entities[1] = {
      ...bundle.entities[1],
      requirements: {
        kind: "example.requirement.unknown"
      } as Bundle["entities"][number]["requirements"]
    };

    expectResolverIssue(bundle, "UNSUPPORTED_REQUIREMENT_TYPE", "/entities/1/requirements/kind");
  });

  it("rejects invalid relation targets", () => {
    const bundle = createBundle();
    bundle.relationships[0] = {
      ...bundle.relationships[0],
      to: "feature.unknown"
    };

    expectResolverIssue(bundle, "INVALID_RELATION_TARGET", "/relationships/0/to");
  });
});

function expectResolverIssue(
  bundle: Bundle,
  code: InstanceType<typeof BundleResolutionError>["issues"][number]["code"],
  path: string
): void {
  try {
    resolveBundle(bundle);
    throw new Error("Expected bundle resolution to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(BundleResolutionError);

    const issue = (error as BundleResolutionError).issues.find(
      (candidate) => candidate.code === code
    );

    expect(issue?.path).toBe(path);
  }
}