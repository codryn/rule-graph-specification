import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const schemaDir = join(rootDir, "schemas");

function collectFiles(directory, results = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(path, results);
      continue;
    }

    if (extname(entry.name) === ".json") {
      results.push(path);
    }
  }

  return results;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  hasFailures = true;
  console.error(message);
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true
});
addFormats(ajv);

const schemaById = new Map();

for (const schemaPath of collectFiles(schemaDir)) {
  const schema = loadJson(schemaPath);
  if (schema.$id) {
    ajv.addSchema(schema, schema.$id);
    schemaById.set(schema.$id, schema);
  }
}

const validations = [
  {
    name: "Example profile",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/profile/profile.schema.json",
    dataPath: join(rootDir, "profiles", "example", "profile.json")
  },
  {
    name: "Minimal example bundle",
    schemaId: "https://schemas.codryn.com/crgs/v0.1/bundle/bundle.schema.json",
    dataPath: join(rootDir, "examples", "minimal", "bundle.json")
  },
  {
    name: "Advanced example bundle",
    schemaId: "https://schemas.codryn.com/crgs/v0.1/bundle/bundle.schema.json",
    dataPath: join(rootDir, "examples", "advanced", "bundle.json")
  },
  {
    name: "Example profile demonstration bundle",
    schemaId: "https://schemas.codryn.com/crgs/v0.1/bundle/bundle.schema.json",
    dataPath: join(rootDir, "profiles", "example", "bundle.json")
  }
];

let hasFailures = false;

const schemaChecks = [
  {
    name: "Entity",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/entities/entity.schema.json",
    validExample: {
      id: "feature.adaptable",
      type: "example.entity.trait",
      label: { default: "Adaptable" }
    },
    invalidExample: {
      id: "feature.adaptable",
      type: "trait"
    }
  },
  {
    name: "LocalizedText",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/common/localized-text.schema.json",
    validExample: {
      default: "Human",
      translations: { fr: "Humain" }
    },
    invalidExample: {
      default: "",
      extra: true
    }
  },
  {
    name: "SourceReference",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/common/source-reference.schema.json",
    validExample: {
      title: "Core Rulebook",
      citation: "Core Rulebook, p. 42"
    },
    invalidExample: {
      title: "Core Rulebook",
      citation: "Core Rulebook, p. 42",
      url: "not-a-uri"
    }
  },
  {
    name: "Metadata",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/common/metadata.schema.json",
    validExample: {
      tags: ["example", "minimal"],
      attributes: { reviewed: true }
    },
    invalidExample: {
      tags: ["dup", "dup"]
    }
  },
  {
    name: "Relation",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/relations/relation.schema.json",
    validExample: {
      id: "rel.human-grants-adaptable",
      type: "example.relation.grants",
      from: "ancestry.human",
      to: "feature.adaptable"
    },
    invalidExample: {
      id: "rel.human-grants-adaptable",
      type: "grants",
      from: "ancestry.human"
    }
  },
  {
    name: "RequirementExpression",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/requirements/requirement-expression.schema.json",
    validExample: {
      kind: "group",
      mode: "all",
      children: [
        {
          kind: "fact",
          fact: "selected:ancestry",
          operator: "equals",
          value: "ancestry.human"
        }
      ]
    },
    invalidExample: {
      kind: "group",
      mode: "all",
      children: []
    }
  },
  {
    name: "RequirementGroup",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/requirements/requirement-group.schema.json",
    validExample: {
      kind: "group",
      mode: "any",
      children: [
        {
          kind: "fact",
          fact: "profile:demo-mode",
          operator: "present"
        }
      ]
    },
    invalidExample: {
      kind: "group",
      mode: "all",
      children: []
    }
  },
  {
    name: "AtomicRequirement",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/requirements/atomic-requirement.schema.json",
    validExample: {
      kind: "fact",
      fact: "selected:ancestry",
      operator: "equals",
      value: "ancestry.human"
    },
    invalidExample: {
      kind: "fact",
      fact: "selected:ancestry",
      operator: "equals"
    }
  },
  {
    name: "ExtensionRegistration",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/profile/extension-registration.schema.json",
    validExample: {
      id: "example.entity.ability",
      schema:
        "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/ability.schema.json"
    },
    invalidExample: {
      id: "ability",
      schema: "not-a-uri"
    }
  },
  {
    name: "ProfileDependency",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/profile/profile-dependency.schema.json",
    validExample: {
      profileId: "codryn.base.common",
      versionRange: "^1.0.0"
    },
    invalidExample: {
      profileId: "",
      versionRange: ""
    }
  },
  {
    name: "ProfileManifest",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/profile/profile-manifest.schema.json",
    validExample: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.1.0",
      specVersion: "0.1.0",
      extensions: {
        entityTypes: [
          {
            id: "example.entity.trait",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json"
          }
        ]
      }
    },
    invalidExample: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.1.0",
      specVersion: "0.1.0",
      extensions: {
        entityTypes: [
          {
            id: "trait",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json"
          }
        ],
        extra: ["nope"]
      }
    }
  },
  {
    name: "DatasetManifest",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/bundle/dataset-manifest.schema.json",
    validExample: {
      id: "example-rpg.minimal",
      title: "Example RPG Minimal Bundle",
      datasetVersion: "0.1.0"
    },
    invalidExample: {
      id: "example-rpg.minimal",
      title: "Example RPG Minimal Bundle"
    }
  },
  {
    name: "Bundle",
    schemaId: "https://schemas.codryn.com/crgs/v0.1/bundle/bundle.schema.json",
    validExample: {
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
              schema:
                "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json"
            }
          ],
          relationTypes: [
            {
              id: "example.relation.grants",
              schema:
                "https://schemas.codryn.com/crgs/profiles/example/v0.1/relations/grants.schema.json"
            }
          ]
        }
      },
      entities: [
        {
          id: "ancestry.human",
          type: "example.entity.trait",
          label: { default: "Human" }
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
    },
    invalidExample: {
      specVersion: "0.1.0",
      profile: {
        id: "example.profile.demo",
        name: "Example RPG",
        version: "0.1.0",
        specVersion: "0.1.0",
        extensions: {}
      },
      entities: [],
      relationships: []
    }
  },
  {
    name: "Profile",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/profile/profile.schema.json",
    validExample: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.1.0",
      specVersion: "0.1.0",
      extensions: {
        entityTypes: [
          {
            id: "example.entity.trait",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json"
          }
        ]
      }
    },
    invalidExample: {
      id: "example.profile.demo",
      name: "Example RPG",
      version: "0.1.0",
      extensions: {
        relationTypes: [
          {
            id: "grants",
            schema:
              "https://schemas.codryn.com/crgs/profiles/example/v0.1/relations/grants.schema.json"
          }
        ]
      }
    }
  },
  {
    name: "Manifest",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/bundle/manifest.schema.json",
    validExample: {
      id: "example-rpg.minimal",
      title: "Example RPG Minimal Bundle",
      datasetVersion: "0.1.0"
    },
    invalidExample: {
      id: "example-rpg.minimal",
      datasetVersion: "0.1.0"
    }
  },
  {
    name: "Relationship",
    schemaId:
      "https://schemas.codryn.com/crgs/v0.1/relations/relationship.schema.json",
    validExample: {
      id: "rel.human-grants-adaptable",
      type: "example.relation.grants",
      from: "ancestry.human",
      to: "feature.adaptable"
    },
    invalidExample: {
      id: "rel.human-grants-adaptable",
      type: "grants",
      from: "ancestry.human"
    }
  }
];

for (const check of schemaChecks) {
  const schema = schemaById.get(check.schemaId);
  if (!schema) {
    fail(`Missing schema definition: ${check.name} (${check.schemaId})`);
    continue;
  }

  for (const keyword of ["$id", "title", "description"]) {
    if (!(keyword in schema)) {
      fail(`Schema metadata missing: ${check.name} lacks ${keyword}`);
    }
  }

  if (schema.type === "object") {
    if (!("required" in schema)) {
      fail(
        `Schema structure missing: ${check.name} lacks explicit required fields`
      );
    }

    if (
      !("additionalProperties" in schema) &&
      !("unevaluatedProperties" in schema)
    ) {
      fail(
        `Schema structure missing: ${check.name} lacks additionalProperties control`
      );
    }
  }

  if (!Array.isArray(schema.examples) || schema.examples.length === 0) {
    fail(`Schema examples missing: ${check.name}`);
  }

  const validator = ajv.getSchema(check.schemaId);
  if (!validator) {
    fail(`Validator missing for schema: ${check.name}`);
    continue;
  }

  if (!validator(check.validExample)) {
    fail(`Schema valid example rejected: ${check.name}`);
    for (const error of validator.errors ?? []) {
      console.error(`  ${error.instancePath || "/"} ${error.message}`);
    }
  } else {
    console.log(`Schema valid example accepted: ${check.name}`);
  }

  if (validator(check.invalidExample)) {
    fail(`Schema invalid example accepted: ${check.name}`);
  } else {
    console.log(`Schema invalid example rejected: ${check.name}`);
  }
}

for (const item of validations) {
  const validator = ajv.getSchema(item.schemaId);
  if (!validator) {
    fail(`Missing schema: ${item.schemaId}`);
    continue;
  }

  const data = loadJson(item.dataPath);
  const valid = validator(data);
  if (!valid) {
    fail(`Validation failed: ${item.name}`);
    for (const error of validator.errors ?? []) {
      console.error(`  ${error.instancePath || "/"} ${error.message}`);
    }
    continue;
  }

  console.log(`Validated: ${item.name}`);
}

if (hasFailures) {
  process.exitCode = 1;
}
