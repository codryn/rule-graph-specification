import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020Module, {
  type ErrorObject,
  type ValidateFunction
} from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type {
  Bundle,
  Effect,
  Profile,
  Relationship,
  RequirementExpression
} from "@codryn/crgs-core";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
  keyword?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface BundleValidationOptions {
  schemaRoots: string[];
  bundleSchemaId?: string;
}

const bundleSchemaId =
  "https://schemas.codryn.com/crgs/v0.2/bundle/bundle.schema.json";
const entityRequirementKind = "crgs.requirement.entity";
const coreRequirementKinds = new Set(["fact", "group", entityRequirementKind]);
interface AjvLike {
  addSchema(schema: unknown, key?: string): AjvLike;
  getSchema(key: string): ValidateFunction<unknown> | undefined;
}
const Ajv2020 = Ajv2020Module as unknown as new (options: {
  allErrors: boolean;
  strict: boolean;
  allowUnionTypes: boolean;
}) => AjvLike;
const addFormats = addFormatsModule as unknown as (instance: AjvLike) => void;

export function createUnimplementedResult(surface: string): ValidationResult {
  return {
    valid: false,
    issues: [
      {
        code: "CRGS_VALIDATOR_NOT_IMPLEMENTED",
        path: "/",
        message: `${surface} validation is not implemented in the package scaffold yet. Use the repository toolchain instead.`,
        severity: "warning"
      }
    ]
  };
}

export function getDefaultSchemaRoots(repoRoot: string): string[] {
  return [join(repoRoot, "schemas"), join(repoRoot, "profiles")];
}

export function validateBundleDocument(
  bundle: Bundle,
  options: BundleValidationOptions
): ValidationResult {
  const ajv = createAjv(options.schemaRoots);
  const issues: ValidationIssue[] = [];
  const validator = ajv.getSchema(options.bundleSchemaId ?? bundleSchemaId);

  if (!validator) {
    return {
      valid: false,
      issues: [
        {
          code: "CRGS_MISSING_SCHEMA_VALIDATOR",
          path: "/",
          message: `Missing bundle schema validator: ${options.bundleSchemaId ?? bundleSchemaId}`,
          severity: "error"
        }
      ]
    };
  }

  if (!validator(bundle)) {
    issues.push(...mapSchemaErrors(validator.errors ?? [], "/"));
    return {
      valid: false,
      issues
    };
  }

  const entitySchemaIds = new Map(
    bundle.profile.extensions.entityTypes?.map((registration) => [
      registration.id,
      registration.schema
    ]) ?? []
  );
  const requirementSchemaIds = new Map(
    bundle.profile.extensions.requirementTypes?.map((registration) => [
      registration.id,
      registration.schema
    ]) ?? []
  );
  const effectSchemaIds = new Map(
    bundle.profile.extensions.effectTypes?.map((registration) => [
      registration.id,
      registration.schema
    ]) ?? []
  );
  const relationSchemaIds = new Map(
    bundle.profile.extensions.relationTypes?.map((registration) => [
      registration.id,
      registration.schema
    ]) ?? []
  );

  for (const [entityIndex, entity] of bundle.entities.entries()) {
    validateRegisteredType(
      entity,
      entity.type,
      entitySchemaIds,
      ajv,
      `/entities/${entityIndex}`,
      "entity type",
      issues
    );

    for (const [effectIndex, effect] of entity.effects?.entries() ?? []) {
      validateRegisteredEffect(
        effect,
        effectSchemaIds,
        ajv,
        `/entities/${entityIndex}/effects/${effectIndex}`,
        issues
      );
    }

    validateRequirementExpression(
      entity.requirements,
      bundle.profile,
      requirementSchemaIds,
      ajv,
      `/entities/${entityIndex}/requirements`,
      issues
    );
  }

  for (const [
    relationshipIndex,
    relationship
  ] of bundle.relationships.entries()) {
    validateRegisteredRelationship(
      relationship,
      relationSchemaIds,
      ajv,
      `/relationships/${relationshipIndex}`,
      issues
    );
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

function createAjv(schemaRoots: string[]): AjvLike {
  const instance = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
  });
  addFormats(instance);

  for (const schemaPath of collectJsonFiles(schemaRoots)) {
    const value = readJson(schemaPath);
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { $id?: unknown }).$id === "string"
    ) {
      instance.addSchema(value, (value as { $id: string }).$id);
    }
  }

  return instance;
}

function collectJsonFiles(roots: string[], files: string[] = []): string[] {
  for (const root of roots) {
    collectFilesUnderRoot(root, files);
  }

  return files;
}

function collectFilesUnderRoot(directory: string, files: string[]): void {
  try {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        collectFilesUnderRoot(path, files);
        continue;
      }

      if (entry.name.endsWith(".json")) {
        files.push(path);
      }
    }
  } catch {
    return;
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateRegisteredType(
  entity: { type: string },
  typeId: string,
  schemaIds: Map<string, string>,
  ajv: AjvLike,
  path: string,
  label: string,
  issues: ValidationIssue[]
): void {
  const schemaId = schemaIds.get(typeId);
  if (!schemaId) {
    issues.push({
      code: "CRGS_UNKNOWN_EXTENSION_IDENTIFIER",
      path: `${path}/type`,
      message: `Unknown registered ${label}: ${typeId}`,
      severity: "error"
    });
    return;
  }

  validateWithSchema(entity, schemaId, ajv, path, issues);
}

function validateRegisteredEffect(
  effect: Effect,
  schemaIds: Map<string, string>,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  const schemaId = schemaIds.get(effect.type);
  if (!schemaId) {
    issues.push({
      code: "CRGS_UNKNOWN_EXTENSION_IDENTIFIER",
      path: `${path}/type`,
      message: `Unknown registered effect type: ${effect.type}`,
      severity: "error"
    });
    return;
  }

  validateWithSchema(effect, schemaId, ajv, path, issues);
}

function validateRegisteredRelationship(
  relationship: Relationship,
  schemaIds: Map<string, string>,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  const schemaId = schemaIds.get(relationship.type);
  if (!schemaId) {
    issues.push({
      code: "CRGS_UNKNOWN_EXTENSION_IDENTIFIER",
      path: `${path}/type`,
      message: `Unknown registered relation type: ${relationship.type}`,
      severity: "error"
    });
    return;
  }

  validateWithSchema(relationship, schemaId, ajv, path, issues);
}

function validateRequirementExpression(
  expression: RequirementExpression | undefined,
  profile: Profile,
  schemaIds: Map<string, string>,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  if (!expression) {
    return;
  }

  if (expression.kind === "group") {
    const children = Array.isArray(
      (expression as { children?: unknown }).children
    )
      ? ((expression as { children: RequirementExpression[] }).children ?? [])
      : [];
    for (const [childIndex, child] of children.entries()) {
      validateRequirementExpression(
        child,
        profile,
        schemaIds,
        ajv,
        `${path}/children/${childIndex}`,
        issues
      );
    }

    return;
  }

  if (coreRequirementKinds.has(expression.kind)) {
    return;
  }

  const schemaId = schemaIds.get(expression.kind);
  if (!schemaId) {
    return;
  }

  validateWithSchema(expression, schemaId, ajv, path, issues);
}

function validateWithSchema(
  value: unknown,
  schemaId: string,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  const validator = ajv.getSchema(schemaId) as
    ValidateFunction<unknown> | undefined;
  if (!validator) {
    issues.push({
      code: "CRGS_MISSING_SCHEMA_VALIDATOR",
      path,
      message: `Missing registered schema validator: ${schemaId}`,
      severity: "error"
    });
    return;
  }

  if (!validator(value)) {
    issues.push(...mapSchemaErrors(validator.errors ?? [], path));
  }
}

function mapSchemaErrors(
  errors: ErrorObject[],
  pathPrefix: string
): ValidationIssue[] {
  return errors.map((error) => ({
    code: "CRGS_SCHEMA_VALIDATION_ERROR",
    path: joinJsonPointer(pathPrefix, error.instancePath),
    message: error.message ?? "Schema validation failed.",
    severity: "error",
    keyword: error.keyword
  }));
}

function joinJsonPointer(prefix: string, suffix: string): string {
  if (!suffix) {
    return prefix || "/";
  }

  if (!prefix || prefix === "/") {
    return suffix;
  }

  return `${prefix}${suffix}`;
}
