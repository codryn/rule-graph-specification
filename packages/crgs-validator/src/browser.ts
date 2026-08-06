import Ajv2020Module, {
  type ErrorObject,
  type ValidateFunction
} from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type {
  Bundle,
  Effect,
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

export interface InMemoryValidationOptions {
  schemas: readonly unknown[];
  bundleSchemaId?: string;
}

interface AjvLike {
  addSchema(schema: unknown, key?: string): AjvLike;
  getSchema(key: string): ValidateFunction<unknown> | undefined;
}

const defaultBundleSchemaId =
  "https://schemas.codryn.com/crgs/v0.2/bundle/bundle.schema.json";
const coreRequirementKinds = new Set([
  "fact",
  "group",
  "crgs.requirement.entity"
]);
const Ajv2020 = Ajv2020Module as unknown as new (options: {
  allErrors: boolean;
  strict: boolean;
  allowUnionTypes: boolean;
}) => AjvLike;
const addFormats = addFormatsModule as unknown as (instance: AjvLike) => void;

export function validateBundleWithSchemas(
  bundle: Bundle,
  options: InMemoryValidationOptions
): ValidationResult {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
  });
  addFormats(ajv);

  for (const schema of options.schemas) {
    if (hasSchemaId(schema)) {
      ajv.addSchema(schema, schema.$id);
    }
  }

  const issues: ValidationIssue[] = [];
  const schemaId = options.bundleSchemaId ?? defaultBundleSchemaId;
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    return missingSchemaResult(schemaId);
  }

  if (!validator(bundle)) {
    return {
      valid: false,
      issues: mapSchemaErrors(validator.errors ?? [], "/")
    };
  }

  const entitySchemas = registrations(bundle, "entityTypes");
  const requirementSchemas = registrations(bundle, "requirementTypes");
  const effectSchemas = registrations(bundle, "effectTypes");
  const relationSchemas = registrations(bundle, "relationTypes");

  for (const [entityIndex, entity] of bundle.entities.entries()) {
    validateRegisteredValue(
      entity,
      entity.type,
      entitySchemas,
      ajv,
      `/entities/${entityIndex}`,
      "entity type",
      issues
    );

    for (const [effectIndex, effect] of entity.effects?.entries() ?? []) {
      validateEffect(
        effect,
        effectSchemas,
        ajv,
        `/entities/${entityIndex}/effects/${effectIndex}`,
        issues
      );
    }

    validateRequirement(
      entity.requirements,
      requirementSchemas,
      ajv,
      `/entities/${entityIndex}/requirements`,
      issues
    );
  }

  for (const [relationIndex, relationship] of bundle.relationships.entries()) {
    validateRelationship(
      relationship,
      relationSchemas,
      ajv,
      `/relationships/${relationIndex}`,
      issues
    );
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues
  };
}

function registrations(
  bundle: Bundle,
  key: keyof Bundle["profile"]["extensions"]
): Map<string, string> {
  return new Map(
    bundle.profile.extensions[key]?.map((registration) => [
      registration.id,
      registration.schema
    ]) ?? []
  );
}

function validateEffect(
  effect: Effect,
  schemas: Map<string, string>,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  validateRegisteredValue(
    effect,
    effect.type,
    schemas,
    ajv,
    path,
    "effect type",
    issues
  );
}

function validateRelationship(
  relationship: Relationship,
  schemas: Map<string, string>,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  validateRegisteredValue(
    relationship,
    relationship.type,
    schemas,
    ajv,
    path,
    "relation type",
    issues
  );
}

function validateRequirement(
  expression: RequirementExpression | undefined,
  schemas: Map<string, string>,
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
      ? (expression as { children: RequirementExpression[] }).children
      : [];
    for (const [childIndex, child] of children.entries()) {
      validateRequirement(
        child,
        schemas,
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

  const schemaId = schemas.get(expression.kind);
  if (schemaId) {
    validateWithSchema(expression, schemaId, ajv, path, issues);
  }
}

function validateRegisteredValue(
  value: unknown,
  typeId: string,
  schemas: Map<string, string>,
  ajv: AjvLike,
  path: string,
  label: string,
  issues: ValidationIssue[]
): void {
  const schemaId = schemas.get(typeId);
  if (!schemaId) {
    issues.push({
      code: "CRGS_UNKNOWN_EXTENSION_IDENTIFIER",
      path: `${path}/type`,
      message: `Unknown registered ${label}: ${typeId}`,
      severity: "error"
    });
    return;
  }
  validateWithSchema(value, schemaId, ajv, path, issues);
}

function validateWithSchema(
  value: unknown,
  schemaId: string,
  ajv: AjvLike,
  path: string,
  issues: ValidationIssue[]
): void {
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    issues.push(missingSchemaIssue(schemaId, path));
    return;
  }
  if (!validator(value)) {
    issues.push(...mapSchemaErrors(validator.errors ?? [], path));
  }
}

function hasSchemaId(value: unknown): value is { $id: string } {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { $id?: unknown }).$id === "string"
  );
}

function missingSchemaResult(schemaId: string): ValidationResult {
  return {
    valid: false,
    issues: [missingSchemaIssue(schemaId, "/")]
  };
}

function missingSchemaIssue(schemaId: string, path: string): ValidationIssue {
  return {
    code: "CRGS_MISSING_SCHEMA_VALIDATOR",
    path,
    message: `Missing registered schema validator: ${schemaId}`,
    severity: "error"
  };
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
  return !prefix || prefix === "/" ? suffix : `${prefix}${suffix}`;
}
