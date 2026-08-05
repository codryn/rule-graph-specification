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

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true
});
addFormats(ajv);

for (const schemaPath of collectFiles(schemaDir)) {
  const schema = loadJson(schemaPath);
  if (schema.$id) {
    ajv.addSchema(schema, schema.$id);
  }
}

const validations = [
  {
    name: "Example profile",
    schemaId: "https://crgs.dev/schema/profile/profile.schema.json",
    dataPath: join(rootDir, "profiles", "example", "profile.json")
  },
  {
    name: "Minimal example bundle",
    schemaId: "https://crgs.dev/schema/bundle/bundle.schema.json",
    dataPath: join(rootDir, "examples", "minimal", "bundle.json")
  },
  {
    name: "Advanced example bundle",
    schemaId: "https://crgs.dev/schema/bundle/bundle.schema.json",
    dataPath: join(rootDir, "examples", "advanced", "bundle.json")
  },
  {
    name: "Example profile demonstration bundle",
    schemaId: "https://crgs.dev/schema/bundle/bundle.schema.json",
    dataPath: join(rootDir, "profiles", "example", "bundle.json")
  }
];

let hasFailures = false;

for (const item of validations) {
  const validator = ajv.getSchema(item.schemaId);
  if (!validator) {
    console.error(`Missing schema: ${item.schemaId}`);
    hasFailures = true;
    continue;
  }

  const data = loadJson(item.dataPath);
  const valid = validator(data);
  if (!valid) {
    hasFailures = true;
    console.error(`Validation failed: ${item.name}`);
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
