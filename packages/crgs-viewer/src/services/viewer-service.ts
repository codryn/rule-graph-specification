import {
  BundleResolutionError,
  evaluate,
  resolveBundle,
  type Bundle,
  type Entity,
  type EntityIndex,
  type EvaluationResult,
  type LocalizedText,
  type RequirementExpression
} from "@codryn/crgs-core";
import {
  buildRuntimeGraph,
  type RuntimeGraph,
  type RuntimeNode
} from "@codryn/crgs-runtime";
import {
  validateBundleWithSchemas,
  type ValidationIssue
} from "@codryn/crgs-validator/browser";
import type {
  Diagnostic,
  EntitySummary,
  PathResult,
  SubjectDocument,
  ViewerDocument,
  ViewerEdgeData,
  ViewerGraphModel,
  ViewerNodeData
} from "../types";

const entityRequirementKind = "crgs.requirement.entity";

export function isBundle(value: unknown): value is Bundle {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Bundle>;
  return (
    typeof candidate.specVersion === "string" &&
    !!candidate.manifest &&
    !!candidate.profile &&
    Array.isArray(candidate.entities) &&
    Array.isArray(candidate.relationships)
  );
}

export function parseJsonDocument(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `Malformed JSON: ${error instanceof Error ? error.message : "unknown parse error"}`,
      { cause: error }
    );
  }
}

export function localizedLabel(
  label: LocalizedText | undefined,
  language: string,
  defaultLanguage: string | undefined,
  fallbackId: string
): string {
  return (
    label?.translations?.[language] ??
    (defaultLanguage ? label?.translations?.[defaultLanguage] : undefined) ??
    label?.default ??
    fallbackId
  );
}

export function availableLanguages(bundle: Bundle): string[] {
  const languages = new Set<string>(["en"]);
  for (const entity of bundle.entities) {
    for (const language of Object.keys(entity.label?.translations ?? {})) {
      languages.add(language);
    }
  }
  return [...languages].sort();
}

export function loadViewerDocument(
  input: unknown,
  schemas: readonly unknown[],
  language = "en",
  suppliedGraph?: RuntimeGraph
): ViewerDocument {
  if (!isBundle(input)) {
    throw new Error("The selected file is not a CRGS bundle document.");
  }

  const validation = validateBundleWithSchemas(input, { schemas });
  const diagnostics = validation.issues.map((issue) =>
    mapValidationIssue(issue, input)
  );
  let runtimeGraph = suppliedGraph;

  try {
    const resolved = resolveBundle(input);
    runtimeGraph ??= buildRuntimeGraph(resolved);
  } catch (error) {
    if (error instanceof BundleResolutionError) {
      diagnostics.push(
        ...error.issues.map((issue) => ({
          ...issue,
          severity: "error" as const,
          entityId: entityIdFromPath(input, issue.path),
          referenceTarget: referencedIdFromMessage(issue.message)
        }))
      );
    } else {
      diagnostics.push({
        code: "CRGS_VIEWER_GRAPH_ERROR",
        severity: "error",
        path: "/",
        message:
          error instanceof Error ? error.message : "Graph generation failed."
      });
    }
  }

  const graph = runtimeGraph
    ? adaptRuntimeGraph(input, runtimeGraph, diagnostics, language)
    : buildPartialGraph(input, diagnostics, language);
  diagnostics.push(...cycleDiagnostics(graph));

  return {
    bundle: input,
    graph,
    diagnostics: uniqueDiagnostics(diagnostics),
    validationValid:
      validation.valid && !diagnostics.some((item) => item.severity === "error")
  };
}

export function adaptRuntimeGraph(
  bundle: Bundle,
  runtimeGraph: RuntimeGraph,
  diagnostics: Diagnostic[] = [],
  language = "en"
): ViewerGraphModel {
  const entities = new Map(
    bundle.entities.map((entity) => [entity.id, entity])
  );
  const invalidIds = new Set(
    diagnostics.flatMap((item) => (item.entityId ? [item.entityId] : []))
  );
  const nodes = runtimeGraph.nodes.map((node) =>
    runtimeNodeToViewer(node, entities, invalidIds, language)
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: ViewerEdgeData[] = runtimeGraph.edges
    .filter((edge) => edge.type !== "required-by")
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationType: edge.type,
      category:
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
          ? "prerequisite"
          : "unresolved",
      logicalRole: "requires",
      origin: "generated"
    }));

  for (const relationship of bundle.relationships) {
    edges.push({
      id: relationship.id,
      source: relationship.from,
      target: relationship.to,
      relationType: relationship.type,
      category:
        nodeIds.has(relationship.from) && nodeIds.has(relationship.to)
          ? "relationship"
          : "unresolved",
      origin: "explicit"
    });
  }

  return {
    nodes: nodes.sort(compareId),
    edges: deduplicateById(edges).sort(compareId),
    cycles: runtimeGraph.cycles
  };
}

export function buildEntitySummaries(
  document: ViewerDocument,
  language: string
): EntitySummary[] {
  const prerequisites = dependencyMap(document.graph.edges, true);
  const dependents = dependencyMap(document.graph.edges, false);
  const invalidIds = new Set(
    document.diagnostics.flatMap((item) =>
      item.entityId ? [item.entityId] : []
    )
  );
  return document.bundle.entities.map((entity) => ({
    entity,
    label: localizedLabel(entity.label, language, undefined, entity.id),
    namespace: namespaceOf(entity.id),
    prerequisiteIds: [...(prerequisites.get(entity.id) ?? [])],
    dependentIds: [...(dependents.get(entity.id) ?? [])],
    invalid: invalidIds.has(entity.id),
    unresolved: document.diagnostics.some(
      (item) => item.entityId === entity.id && item.referenceTarget
    )
  }));
}

export function filterEntities(
  summaries: EntitySummary[],
  options: {
    search: string;
    type: string;
    namespace: string;
    flags: Set<string>;
  }
): EntitySummary[] {
  const query = options.search.trim().toLocaleLowerCase();
  return summaries.filter((summary) => {
    const aliases = Array.isArray(summary.entity.data?.aliases)
      ? summary.entity.data.aliases.join(" ")
      : "";
    const haystack = [
      summary.label,
      summary.entity.id,
      summary.entity.type,
      summary.namespace,
      aliases
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!options.type || summary.entity.type === options.type) &&
      (!options.namespace || summary.namespace === options.namespace) &&
      (!options.flags.has("prerequisites") ||
        summary.prerequisiteIds.length > 0) &&
      (!options.flags.has("dependents") || summary.dependentIds.length > 0) &&
      (!options.flags.has("invalid") || summary.invalid) &&
      (!options.flags.has("unresolved") || summary.unresolved) &&
      (!options.flags.has("isolated") ||
        (summary.prerequisiteIds.length === 0 &&
          summary.dependentIds.length === 0))
    );
  });
}

export function dependencyIds(
  graph: ViewerGraphModel,
  entityId: string,
  direction: "prerequisites" | "dependents",
  transitive: boolean
): string[] {
  const map = dependencyMap(graph.edges, direction === "prerequisites");
  const found = new Set<string>();
  const queue = [...(map.get(entityId) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || found.has(next)) continue;
    found.add(next);
    if (transitive) queue.push(...(map.get(next) ?? []));
  }
  return [...found].sort();
}

export function evaluateEntity(
  bundle: Bundle,
  entity: Entity,
  subject: SubjectDocument
): EvaluationResult {
  if (!entity.requirements) {
    return { satisfied: true, evaluated: [], missing: [] };
  }
  return evaluate(entity.requirements, {
    facts: subject.facts,
    entityIds: subject.entityIds,
    entityIndex: looseEntityIndex(bundle)
  });
}

export function findDependencyPath(
  graph: ViewerGraphModel,
  startId: string,
  targetId: string
): PathResult {
  const outgoing = new Map<string, ViewerEdgeData[]>();
  for (const edge of graph.edges.filter(
    (item) => item.category === "prerequisite"
  )) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  const visited = new Set([startId]);
  const queue = [startId];
  while (queue.length && !visited.has(targetId)) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of outgoing.get(current) ?? []) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);
      previous.set(edge.target, { nodeId: current, edgeId: edge.id });
      queue.push(edge.target);
    }
  }
  if (!visited.has(targetId)) {
    return { startId, targetId, nodeIds: [], edgeIds: [], found: false };
  }
  const nodeIds = [targetId];
  const edgeIds: string[] = [];
  while (nodeIds[0] !== startId) {
    const step = previous.get(nodeIds[0]);
    if (!step) break;
    nodeIds.unshift(step.nodeId);
    edgeIds.unshift(step.edgeId);
  }
  return { startId, targetId, nodeIds, edgeIds, found: true };
}

export function requirementText(expression: RequirementExpression): string {
  if (expression.kind === "group") {
    const mode =
      typeof expression.mode === "string" ? expression.mode : "group";
    return `${mode === "all" ? "All" : mode === "any" ? "Any" : "None"} of`;
  }
  if (expression.kind === "fact") {
    const operator =
      expression.operator === "atLeast"
        ? ">="
        : expression.operator === "equals"
          ? "="
          : "is present";
    return `${expression.fact} ${operator}${"value" in expression ? ` ${String(expression.value)}` : ""}`;
  }
  if (expression.kind === entityRequirementKind) {
    return typeof expression.targetId === "string"
      ? expression.targetId
      : "Missing target";
  }
  return `Unsupported: ${expression.kind}`;
}

function runtimeNodeToViewer(
  node: RuntimeNode,
  entities: Map<string, Entity>,
  invalidIds: Set<string>,
  language: string
): ViewerNodeData {
  if (node.kind === "virtual-threshold") {
    return {
      id: node.id,
      label: `${node.fact.split(":").at(-1) ?? node.fact} >= ${node.value}`,
      shortId: node.id,
      kind: "virtual-threshold",
      entityType: "fact threshold",
      namespace: namespaceOf(node.fact),
      status: "valid"
    };
  }
  const entity = entities.get(node.id);
  return {
    id: node.id,
    label: localizedLabel(entity?.label, language, undefined, node.id),
    shortId: shortId(node.id),
    kind: entity ? "entity" : "unresolved",
    entityType: node.entityType,
    namespace: namespaceOf(node.id),
    status: entity
      ? invalidIds.has(node.id)
        ? "invalid"
        : "valid"
      : "unresolved"
  };
}

function buildPartialGraph(
  bundle: Bundle,
  diagnostics: Diagnostic[],
  language: string
): ViewerGraphModel {
  const invalidIds = new Set(
    diagnostics.flatMap((item) => (item.entityId ? [item.entityId] : []))
  );
  const nodes: ViewerNodeData[] = bundle.entities.map((entity) => ({
    id: entity.id,
    label: localizedLabel(entity.label, language, undefined, entity.id),
    shortId: shortId(entity.id),
    kind: "entity",
    entityType: entity.type,
    namespace: namespaceOf(entity.id),
    status: invalidIds.has(entity.id) ? "invalid" : "valid"
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: ViewerEdgeData[] = [];
  for (const entity of bundle.entities) {
    collectLooseRequirements(
      entity.requirements,
      entity.id,
      nodes,
      edges,
      nodeIds
    );
  }
  for (const relationship of bundle.relationships) {
    ensureUnresolvedNode(relationship.from, nodes, nodeIds);
    ensureUnresolvedNode(relationship.to, nodes, nodeIds);
    edges.push({
      id: relationship.id,
      source: relationship.from,
      target: relationship.to,
      relationType: relationship.type,
      category:
        nodeIds.has(relationship.from) && nodeIds.has(relationship.to)
          ? "relationship"
          : "unresolved",
      origin: "explicit"
    });
  }
  return {
    nodes: deduplicateById(nodes).sort(compareId),
    edges: deduplicateById(edges).sort(compareId),
    cycles: []
  };
}

function collectLooseRequirements(
  expression: RequirementExpression | undefined,
  ownerId: string,
  nodes: ViewerNodeData[],
  edges: ViewerEdgeData[],
  nodeIds: Set<string>
): void {
  if (!expression) return;
  if (expression.kind === "group") {
    const children = Array.isArray(
      (expression as { children?: unknown }).children
    )
      ? (expression as { children: RequirementExpression[] }).children
      : [];
    children.forEach((child) =>
      collectLooseRequirements(child, ownerId, nodes, edges, nodeIds)
    );
    return;
  }
  let sourceId: string | undefined;
  if (
    expression.kind === entityRequirementKind &&
    typeof expression.targetId === "string"
  )
    sourceId = expression.targetId;
  if (
    expression.kind === "fact" &&
    expression.operator === "atLeast" &&
    typeof expression.fact === "string" &&
    typeof expression.value === "number"
  ) {
    sourceId = `virtual.${expression.fact.replace(/[^a-z0-9]+/gi, ".").toLowerCase()}.gte.${expression.value}`;
    if (!nodeIds.has(sourceId)) {
      nodes.push({
        id: sourceId,
        label: `${expression.fact.split(":").at(-1) ?? expression.fact} >= ${expression.value}`,
        shortId: sourceId,
        kind: "virtual-threshold",
        entityType: "fact threshold",
        namespace: namespaceOf(expression.fact),
        status: "valid"
      });
      nodeIds.add(sourceId);
    }
  }
  if (!sourceId) return;
  const unresolved = !nodeIds.has(sourceId);
  if (unresolved) ensureUnresolvedNode(sourceId, nodes, nodeIds);
  edges.push({
    id: `requires:${sourceId}:${ownerId}`,
    source: sourceId,
    target: ownerId,
    relationType: "requires",
    category: unresolved ? "unresolved" : "prerequisite",
    logicalRole: "requires",
    origin: "generated"
  });
}

function ensureUnresolvedNode(
  id: string,
  nodes: ViewerNodeData[],
  nodeIds: Set<string>
): void {
  if (nodeIds.has(id)) return;
  nodes.push({
    id,
    label: id,
    shortId: shortId(id),
    kind: "unresolved",
    entityType: "unresolved reference",
    namespace: namespaceOf(id),
    status: "unresolved"
  });
  nodeIds.add(id);
}

function mapValidationIssue(
  issue: ValidationIssue,
  bundle: Bundle
): Diagnostic {
  return { ...issue, entityId: entityIdFromPath(bundle, issue.path) };
}

function cycleDiagnostics(graph: ViewerGraphModel): Diagnostic[] {
  return graph.cycles.map((cycle, index) => ({
    code: "CRGS_GRAPH_CYCLE",
    severity: "error",
    path: "/entities",
    entityId: cycle.nodeIds[0],
    elementId: cycle.edgeIds[0],
    message: `Dependency cycle ${index + 1}: ${cycle.nodeIds.join(" -> ")}`
  }));
}

function entityIdFromPath(bundle: Bundle, path: string): string | undefined {
  const match = /^\/entities\/(\d+)/.exec(path);
  return match ? bundle.entities[Number(match[1])]?.id : undefined;
}

function referencedIdFromMessage(message: string): string | undefined {
  const match = /(?:target|entity):\s+([^\s]+)$/i.exec(message);
  return match?.[1];
}

function looseEntityIndex(bundle: Bundle): EntityIndex {
  return {
    byId: new Map(bundle.entities.map((entity) => [entity.id, entity])),
    outgoingRelations: new Map(),
    incomingRelations: new Map()
  };
}

function dependencyMap(
  edges: ViewerEdgeData[],
  reverse: boolean
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const edge of edges.filter((item) => item.category === "prerequisite")) {
    const key = reverse ? edge.target : edge.source;
    const value = reverse ? edge.source : edge.target;
    const values = result.get(key) ?? new Set<string>();
    values.add(value);
    result.set(key, values);
  }
  return result;
}

function uniqueDiagnostics(items: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.code}:${item.path}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function namespaceOf(id: string): string {
  return id.split(/[.:]/)[0] ?? id;
}

function shortId(id: string): string {
  const parts = id.split(".");
  return parts.at(-1) ?? id;
}

function compareId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}
