import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  BundleResolutionError,
  resolveBundle,
  type Bundle,
  type ResolverIssue
} from "../packages/crgs-core/src/index.js";
import { buildRuntimeGraph } from "../packages/crgs-runtime/src/index.js";
import {
  getDefaultSchemaRoots,
  validateBundleDocument
} from "../packages/crgs-validator/src/index.js";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const schemaDir = join(rootDir, "schemas");
const conformanceDir = join(rootDir, "conformance");
const schemaRoots = getDefaultSchemaRoots(rootDir);
const bundleSchemaId =
  "https://schemas.codryn.com/crgs/v0.2/bundle/bundle.schema.json";

interface ConformanceError {
  code: string;
  path: string;
  reference?: string;
  keyword?: string;
  cycle?: string[];
}

interface ConformanceResult {
  valid: boolean;
  errors: ConformanceError[];
  graph?: {
    nodes: unknown[];
    edges: unknown[];
    cycles: unknown[];
  };
}

interface ConformanceCase {
  id: string;
  inputPath: string;
  expectedPath: string;
}

const ajv = createAjv();
const conformanceCases = loadConformanceCases();

describe("conformance suite", () => {
  for (const testCase of conformanceCases) {
    it(testCase.id, () => {
      const bundle = readJson(testCase.inputPath) as Bundle;
      const expected = readJson(testCase.expectedPath) as ConformanceResult;
      const actual = runConformance(bundle);

      expect(actual.valid).toBe(expected.valid);
      expect(actual.errors).toEqual(expected.errors);

      if (expected.graph !== undefined) {
        expect(actual.graph).toEqual(expected.graph);
      }
    });
  }
});

function loadConformanceCases(): ConformanceCase[] {
  const categories = ["valid", "invalid"];
  const cases: ConformanceCase[] = [];

  for (const category of categories) {
    const categoryDir = join(conformanceDir, category);
    for (const entry of readdirSync(categoryDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      cases.push({
        id: `${category}/${entry.name}`,
        inputPath: join(categoryDir, entry.name, "input", "bundle.json"),
        expectedPath: join(categoryDir, entry.name, "expected-result.json")
      });
    }
  }

  return cases.sort((left, right) => left.id.localeCompare(right.id));
}

function runConformance(bundle: Bundle): ConformanceResult {
  const validateBundle = ajv.getSchema(bundleSchemaId);
  if (!validateBundle) {
    throw new Error(`Missing bundle schema validator: ${bundleSchemaId}`);
  }

  const schemaValid = validateBundle(bundle);
  if (!schemaValid) {
    return {
      valid: false,
      errors: mapSchemaErrors(validateBundle.errors ?? [])
    };
  }

  const profileAwareValidation = validateBundleDocument(bundle, {
    schemaRoots
  });
  const profileAwareErrors = profileAwareValidation.issues.filter(
    (issue) => issue.code === "CRGS_SCHEMA_VALIDATION_ERROR"
  );
  if (profileAwareErrors.length > 0) {
    return {
      valid: false,
      errors: profileAwareErrors.map((issue) => ({
        code: issue.code,
        path: issue.path,
        keyword: issue.keyword
      }))
    };
  }

  try {
    const resolved = resolveBundle(bundle);
    const graph = buildRuntimeGraph(resolved);
    if (graph.cycles.length > 0) {
      return {
        valid: false,
        errors: graph.cycles.map((cycle) => ({
          code: "CRGS_CYCLIC_PREREQUISITES",
          path: "/",
          cycle: cycle.nodeIds
        }))
      };
    }

    return {
      valid: true,
      errors: [],
      graph
    };
  } catch (error) {
    if (error instanceof BundleResolutionError) {
      return {
        valid: false,
        errors: mapResolverIssues(bundle, error.issues)
      };
    }

    throw error;
  }
}

function createAjv(): Ajv2020 {
  const instance = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
  });
  addFormats(instance);

  for (const schemaPath of collectJsonFiles(schemaDir)) {
    const schema = readJson(schemaPath) as Record<string, unknown>;
    if (typeof schema.$id === "string") {
      instance.addSchema(schema, schema.$id);
    }
  }

  return instance;
}

function collectJsonFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(path, files);
      continue;
    }

    if (entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function mapSchemaErrors(errors: ErrorObject[]): ConformanceError[] {
  const uniqueErrors = new Map<string, ConformanceError>();

  for (const error of errors) {
    const mappedError: ConformanceError = {
      code: "CRGS_SCHEMA_VALIDATION_ERROR",
      path: error.instancePath || "/",
      keyword: error.keyword
    };
    uniqueErrors.set(
      `${mappedError.code}|${mappedError.path}|${mappedError.keyword ?? ""}`,
      mappedError
    );
  }

  return [...uniqueErrors.values()].sort(compareErrors);
}

function mapResolverIssues(
  bundle: Bundle,
  issues: ResolverIssue[]
): ConformanceError[] {
  return issues
    .map((issue) => ({
      code: mapResolverIssueCode(issue.code),
      path: issue.path,
      reference: readStringAtJsonPointer(bundle, issue.path)
    }))
    .sort(compareErrors);
}

function mapResolverIssueCode(code: ResolverIssue["code"]): string {
  switch (code) {
    case "DUPLICATE_ENTITY_ID":
      return "CRGS_DUPLICATE_ENTITY_ID";
    case "UNKNOWN_REFERENCED_ENTITY":
    case "INVALID_REQUIREMENT_TARGET":
    case "INVALID_RELATION_TARGET":
      return "CRGS_REFERENCE_NOT_FOUND";
    case "INVALID_PROFILE_NAMESPACE":
      return "CRGS_INVALID_PROFILE_NAMESPACE";
    case "UNSUPPORTED_REQUIREMENT_TYPE":
      return "CRGS_UNKNOWN_REQUIREMENT_TYPE";
  }
}

function readStringAtJsonPointer(
  value: unknown,
  pointer: string
): string | undefined {
  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = value;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function compareErrors(
  left: ConformanceError,
  right: ConformanceError
): number {
  return `${left.code}|${left.path}|${left.reference ?? ""}|${left.keyword ?? ""}`.localeCompare(
    `${right.code}|${right.path}|${right.reference ?? ""}|${right.keyword ?? ""}`
  );
}
