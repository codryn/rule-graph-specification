import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BundleResolutionError,
  evaluate,
  resolveBundle,
  type Bundle
} from "../packages/crgs-core/src/index.js";
import { buildRuntimeGraph } from "../packages/crgs-runtime/src/index.js";
import {
  getDefaultSchemaRoots,
  validateBundleDocument
} from "../packages/crgs-validator/src/index.js";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const schemaRoots = getDefaultSchemaRoots(rootDir);

describe("PF1e profile", () => {
  it("validates the reference profile bundle", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const result = validateBundleDocument(bundle, { schemaRoots });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("Power Attack requires Strength 13 and BAB +1", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const powerAttack = getEntity(bundle, "pf1e.feat.power-attack");

    expect(
      evaluate(powerAttack.requirements!, {
        facts: {
          "pf1e.ability.str": 13,
          "pf1e.base-attack-bonus": 1
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(powerAttack.requirements!, {
        facts: {
          "pf1e.ability.str": 12,
          "pf1e.base-attack-bonus": 1
        }
      }).satisfied
    ).toBe(false);
  });

  it("Cleave requires Power Attack", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const resolved = resolveBundle(bundle);
    const cleave = getEntity(bundle, "pf1e.feat.cleave");

    expect(
      evaluate(cleave.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.power-attack"],
        facts: {
          "pf1e.ability.str": 13
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(cleave.requirements!, {
        entityIndex: resolved.index,
        entityIds: [],
        facts: {
          "pf1e.ability.str": 13
        }
      }).satisfied
    ).toBe(false);
  });

  it("Great Cleave requires Cleave", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const resolved = resolveBundle(bundle);
    const greatCleave = getEntity(bundle, "pf1e.feat.great-cleave");

    expect(
      evaluate(greatCleave.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.cleave"],
        facts: {
          "pf1e.base-attack-bonus": 4
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(greatCleave.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.power-attack"],
        facts: {
          "pf1e.base-attack-bonus": 4
        }
      }).satisfied
    ).toBe(false);
  });

  it("Weapon Specialization requires Fighter level 4", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const resolved = resolveBundle(bundle);
    const weaponSpecialization = getEntity(
      bundle,
      "pf1e.feat.weapon-specialization.longsword"
    );

    expect(
      evaluate(weaponSpecialization.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.weapon-focus.longsword"],
        facts: {
          "pf1e.class-level.fighter": 4
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(weaponSpecialization.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.weapon-focus.longsword"],
        facts: {
          "pf1e.class-level.fighter": 3
        }
      }).satisfied
    ).toBe(false);
  });

  it("Acrobatic Steps uses a skill-ranks prerequisite in the live bundle", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const acrobaticSteps = getEntity(bundle, "pf1e.feat.acrobatic-steps");

    expect(
      evaluate(acrobaticSteps.requirements!, {
        facts: {
          "pf1e.ability.dex": 15,
          "pf1e.skill-ranks.acrobatics": 1
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(acrobaticSteps.requirements!, {
        facts: {
          "pf1e.ability.dex": 15,
          "pf1e.skill-ranks.acrobatics": 0
        }
      }).satisfied
    ).toBe(false);
  });

  it("Leadership uses a character-level prerequisite in the live bundle", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const leadership = getEntity(bundle, "pf1e.feat.leadership");

    expect(
      evaluate(leadership.requirements!, {
        facts: {
          "pf1e.character-level": 7
        }
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(leadership.requirements!, {
        facts: {
          "pf1e.character-level": 6
        }
      }).satisfied
    ).toBe(false);
  });

  it("Greater Spell Focus requires Spell Focus with the same school", () => {
    const bundle = loadBundle("profiles", "pf1e", "bundle.json");
    const resolved = resolveBundle(bundle);
    const greaterSpellFocus = getEntity(
      bundle,
      "pf1e.feat.greater-spell-focus.evocation"
    );

    expect(
      evaluate(greaterSpellFocus.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.spell-focus.evocation"]
      }).satisfied
    ).toBe(true);

    expect(
      evaluate(greaterSpellFocus.requirements!, {
        entityIndex: resolved.index,
        entityIds: ["pf1e.feat.spell-focus.necromancy"]
      }).satisfied
    ).toBe(false);
  });

  it("accepts the OR-expression example bundle", () => {
    const bundle = loadBundle(
      "profiles",
      "pf1e",
      "examples",
      "valid",
      "or-expression.bundle.json"
    );
    const result = validateBundleDocument(bundle, { schemaRoots });

    expect(result.valid).toBe(true);
  });

  it("detects cycles in the cyclic example bundle", () => {
    const bundle = loadBundle(
      "profiles",
      "pf1e",
      "examples",
      "invalid",
      "cyclic-feats.bundle.json"
    );
    const graph = buildRuntimeGraph(resolveBundle(bundle));

    expect(graph.cycles).toHaveLength(1);
    expect(graph.cycles[0]?.nodeIds).toEqual([
      "pf1e.feat.loop-a",
      "pf1e.feat.loop-b"
    ]);
  });

  it("rejects unknown feat references", () => {
    const bundle = loadBundle(
      "profiles",
      "pf1e",
      "examples",
      "invalid",
      "unknown-feat-reference.bundle.json"
    );

    expect(() => resolveBundle(bundle)).toThrowError(BundleResolutionError);

    try {
      resolveBundle(bundle);
    } catch (error) {
      expect(error).toBeInstanceOf(BundleResolutionError);
      expect((error as BundleResolutionError).issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "INVALID_REQUIREMENT_TARGET",
            path: "/entities/0/requirements/targetId"
          })
        ])
      );
    }
  });

  it("rejects invalid selections", () => {
    const bundle = loadBundle(
      "profiles",
      "pf1e",
      "examples",
      "invalid",
      "invalid-selection.bundle.json"
    );
    const result = validateBundleDocument(bundle, { schemaRoots });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CRGS_SCHEMA_VALIDATION_ERROR",
          path: "/entities/0/data/parameter/value"
        })
      ])
    );
  });
});

function loadBundle(...segments: string[]): Bundle {
  return JSON.parse(readFileSync(resolve(rootDir, ...segments), "utf8"));
}

function getEntity(
  bundle: Bundle,
  entityId: string
): Bundle["entities"][number] {
  const entity = bundle.entities.find((candidate) => candidate.id === entityId);
  if (!entity) {
    throw new Error(`Unknown entity ID: ${entityId}`);
  }

  return entity;
}
