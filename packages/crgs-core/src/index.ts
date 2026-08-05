export interface LocalizedText {
  default: string;
  translations?: Record<string, string>;
}

export interface SourceReference {
  title: string;
  citation: string;
  locator?: string;
  url?: string;
}

export interface Metadata {
  tags?: string[];
  attributes?: Record<string, string | number | boolean | null>;
}

export type RequirementExpression =
  | {
      kind: "fact";
      fact: string;
      operator: "equals" | "atLeast";
      value: string | number | boolean;
    }
  | {
      kind: "fact";
      fact: string;
      operator: "present";
    }
  | {
      kind: "group";
      mode: "all" | "any" | "none";
      children: RequirementExpression[];
    };

export type Effect =
  | {
      type: string;
      target: string;
      operation: "set" | "increase" | "decrease" | "grant";
      value: string | number | boolean;
    }
  | {
      type: string;
      target: string;
      operation: "set" | "increase" | "decrease" | "grant";
      formula: string;
    };

export interface Entity {
  id: string;
  type: string;
  label: LocalizedText;
  source?: SourceReference;
  requirements?: RequirementExpression;
  effects?: Effect[];
  metadata?: Metadata;
}

export interface Relationship {
  id: string;
  type: string;
  from: string;
  to: string;
  metadata?: Metadata;
}

export type Relation = Relationship;

export interface ExtensionRegistration {
  id: string;
  schema: string;
  description?: string;
}

export interface ProfileDependency {
  profileId: string;
  versionRange: string;
}

export interface Profile {
  id: string;
  name: string;
  version: string;
  specVersion: string;
  description?: string;
  dependencies?: ProfileDependency[];
  extensions: {
    entityTypes?: ExtensionRegistration[];
    requirementTypes?: ExtensionRegistration[];
    effectTypes?: ExtensionRegistration[];
    relationTypes?: ExtensionRegistration[];
  };
}

export interface Manifest {
  id: string;
  title: string;
  datasetVersion: string;
  description?: string;
}

export interface Bundle {
  specVersion: string;
  manifest: Manifest;
  profile: Profile;
  entities: Entity[];
  relationships: Relationship[];
  metadata?: Metadata;
}

export interface EntityIndex {
  byId: Map<string, Entity>;
  outgoingRelations: Map<string, Relation[]>;
  incomingRelations: Map<string, Relation[]>;
}

export type ResolverIssueCode =
  | "DUPLICATE_ENTITY_ID"
  | "UNKNOWN_REFERENCED_ENTITY"
  | "INVALID_PROFILE_NAMESPACE"
  | "UNSUPPORTED_REQUIREMENT_TYPE"
  | "INVALID_RELATION_TARGET";

export interface ResolverIssue {
  code: ResolverIssueCode;
  path: string;
  message: string;
}

export interface ResolvedBundle {
  bundle: Bundle;
  index: EntityIndex;
}

export class BundleResolutionError extends Error {
  readonly issues: ResolverIssue[];

  constructor(issues: ResolverIssue[]) {
    super(
      `Bundle resolution failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}.`
    );
    this.name = "BundleResolutionError";
    this.issues = issues;
  }
}

const coreRequirementKinds = new Set(["fact", "group"]);
const extensionCategoryByRegistryKey = {
  entityTypes: "entity",
  requirementTypes: "requirement",
  effectTypes: "effect",
  relationTypes: "relation"
} as const;

type ExtensionRegistryKey = keyof Profile["extensions"];
type ExtensionCategory =
  (typeof extensionCategoryByRegistryKey)[keyof typeof extensionCategoryByRegistryKey];

interface RequirementLike {
  kind?: unknown;
  children?: unknown;
}

export function resolveBundle(bundle: Bundle): ResolvedBundle {
  const issues: ResolverIssue[] = [];
  const namespace = deriveProfileNamespace(bundle.profile.id);
  const index: EntityIndex = {
    byId: new Map<string, Entity>(),
    outgoingRelations: new Map<string, Relation[]>(),
    incomingRelations: new Map<string, Relation[]>()
  };

  validateProfileRegistrations(bundle.profile, namespace, issues);

  for (const [entityIndex, entity] of bundle.entities.entries()) {
    if (index.byId.has(entity.id)) {
      issues.push({
        code: "DUPLICATE_ENTITY_ID",
        path: `/entities/${entityIndex}/id`,
        message: `Duplicate entity ID: ${entity.id}`
      });
      continue;
    }

    if (!hasProfileNamespace(entity.type, "entity", namespace)) {
      issues.push({
        code: "INVALID_PROFILE_NAMESPACE",
        path: `/entities/${entityIndex}/type`,
        message: `Invalid profile namespace for entity type: ${entity.type}`
      });
    }

    index.byId.set(entity.id, entity);
    index.outgoingRelations.set(entity.id, []);
    index.incomingRelations.set(entity.id, []);

    validateRequirementExpression(
      entity.requirements,
      `/entities/${entityIndex}/requirements`,
      namespace,
      bundle.profile,
      issues
    );

    for (const [effectIndex, effect] of entity.effects?.entries() ?? []) {
      if (!hasProfileNamespace(effect.type, "effect", namespace)) {
        issues.push({
          code: "INVALID_PROFILE_NAMESPACE",
          path: `/entities/${entityIndex}/effects/${effectIndex}/type`,
          message: `Invalid profile namespace for effect type: ${effect.type}`
        });
      }
    }
  }

  for (const [relationIndex, relationship] of bundle.relationships.entries()) {
    if (!hasProfileNamespace(relationship.type, "relation", namespace)) {
      issues.push({
        code: "INVALID_PROFILE_NAMESPACE",
        path: `/relationships/${relationIndex}/type`,
        message: `Invalid profile namespace for relation type: ${relationship.type}`
      });
    }

    const sourceEntity = index.byId.get(relationship.from);
    if (!sourceEntity) {
      issues.push({
        code: "UNKNOWN_REFERENCED_ENTITY",
        path: `/relationships/${relationIndex}/from`,
        message: `Unknown referenced entity: ${relationship.from}`
      });
    }

    const targetEntity = index.byId.get(relationship.to);
    if (!targetEntity) {
      issues.push({
        code: "INVALID_RELATION_TARGET",
        path: `/relationships/${relationIndex}/to`,
        message: `Invalid relation target: ${relationship.to}`
      });
    }

    if (sourceEntity && targetEntity) {
      index.outgoingRelations.get(relationship.from)?.push(relationship);
      index.incomingRelations.get(relationship.to)?.push(relationship);
    }
  }

  if (issues.length > 0) {
    throw new BundleResolutionError(issues);
  }

  return {
    bundle,
    index
  };
}

function deriveProfileNamespace(profileId: string): string {
  const profileMarker = ".profile.";
  const markerIndex = profileId.indexOf(profileMarker);

  if (markerIndex > 0) {
    return profileId.slice(0, markerIndex);
  }

  const firstSeparator = profileId.indexOf(".");
  return firstSeparator > 0 ? profileId.slice(0, firstSeparator) : profileId;
}

function validateProfileRegistrations(
  profile: Profile,
  namespace: string,
  issues: ResolverIssue[]
): void {
  for (const [registryKey, category] of Object.entries(
    extensionCategoryByRegistryKey
  ) as [ExtensionRegistryKey, ExtensionCategory][]) {
    const registrations = profile.extensions[registryKey] ?? [];

    for (const [registrationIndex, registration] of registrations.entries()) {
      if (!hasProfileNamespace(registration.id, category, namespace)) {
        issues.push({
          code: "INVALID_PROFILE_NAMESPACE",
          path: `/profile/extensions/${registryKey}/${registrationIndex}/id`,
          message: `Invalid profile namespace for ${category} type: ${registration.id}`
        });
      }
    }
  }
}

function validateRequirementExpression(
  requirement: RequirementExpression | undefined,
  path: string,
  namespace: string,
  profile: Profile,
  issues: ResolverIssue[]
): void {
  if (!requirement) {
    return;
  }

  const requirementLike = requirement as RequirementLike;
  const kind = requirementLike.kind;
  if (typeof kind !== "string") {
    issues.push({
      code: "UNSUPPORTED_REQUIREMENT_TYPE",
      path: `${path}/kind`,
      message: "Unsupported requirement type: <missing>"
    });
    return;
  }

  if (coreRequirementKinds.has(kind)) {
    if (kind === "group") {
      for (const [childIndex, child] of Array.isArray(requirementLike.children)
        ? requirementLike.children.entries()
        : []) {
        validateRequirementExpression(
          child as RequirementExpression,
          `${path}/children/${childIndex}`,
          namespace,
          profile,
          issues
        );
      }
    }

    return;
  }

  if (!hasProfileNamespace(kind, "requirement", namespace)) {
    issues.push({
      code: "INVALID_PROFILE_NAMESPACE",
      path: `${path}/kind`,
      message: `Invalid profile namespace for requirement type: ${kind}`
    });
    return;
  }

  const supportedRequirementKinds = new Set(
    profile.extensions.requirementTypes?.map((registration) => registration.id) ?? []
  );

  if (!supportedRequirementKinds.has(kind)) {
    issues.push({
      code: "UNSUPPORTED_REQUIREMENT_TYPE",
      path: `${path}/kind`,
      message: `Unsupported requirement type: ${kind}`
    });
  }
}

function hasProfileNamespace(
  identifier: string,
  category: ExtensionCategory,
  namespace: string
): boolean {
  return identifier.startsWith(`${namespace}.${category}.`);
}
