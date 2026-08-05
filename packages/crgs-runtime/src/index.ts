import {
  resolveBundle,
  type Bundle,
  type CustomRequirementExpression,
  type FactRequirement,
  type GroupRequirement,
  type RequirementExpression,
  type ResolvedBundle
} from "@codryn/crgs-core";

export interface EntityRuntimeNode {
  id: string;
  kind: "entity";
  entityType: string;
}

export interface VirtualThresholdRuntimeNode {
  id: string;
  kind: "virtual-threshold";
  fact: string;
  operator: "atLeast";
  value: number;
}

export type RuntimeNode = EntityRuntimeNode | VirtualThresholdRuntimeNode;

export interface RuntimeEdge {
  id: string;
  type: string;
  source: string;
  target: string;
}

export interface RuntimeCycle {
  nodeIds: string[];
  edgeIds: string[];
}

export interface RuntimeGraph {
  nodes: RuntimeNode[];
  edges: RuntimeEdge[];
  cycles: RuntimeCycle[];
}

export function createEmptyRuntimeGraph(): RuntimeGraph {
  return {
    nodes: [],
    edges: [],
    cycles: []
  };
}

const entityRequirementKind = "crgs.requirement.entity";

export function buildRuntimeGraph(
  bundleOrResolved: Bundle | ResolvedBundle
): RuntimeGraph {
  const resolved = isResolvedBundle(bundleOrResolved)
    ? bundleOrResolved
    : resolveBundle(bundleOrResolved);
  const graph = createEmptyRuntimeGraph();
  const nodeById = new Map<string, RuntimeNode>();
  const edgeById = new Map<string, RuntimeEdge>();

  for (const entity of [...resolved.index.byId.values()].sort(
    compareEntityIds
  )) {
    nodeById.set(entity.id, {
      id: entity.id,
      kind: "entity",
      entityType: entity.type
    });

    collectRequirementEdges(
      entity.id,
      entity.requirements,
      resolved,
      nodeById,
      edgeById
    );
  }

  graph.nodes = [...nodeById.values()].sort(compareNodes);
  graph.edges = [...edgeById.values()].sort(compareEdges);
  graph.cycles = detectCycles(graph.nodes, graph.edges);

  return graph;
}

function isResolvedBundle(
  value: Bundle | ResolvedBundle
): value is ResolvedBundle {
  return "bundle" in value && "index" in value;
}

function compareEntityIds(left: { id: string }, right: { id: string }): number {
  return left.id.localeCompare(right.id);
}

function collectRequirementEdges(
  ownerId: string,
  expression: RequirementExpression | undefined,
  resolved: ResolvedBundle,
  nodeById: Map<string, RuntimeNode>,
  edgeById: Map<string, RuntimeEdge>,
  includeDependencies = true
): void {
  if (!expression) {
    return;
  }

  if (isGroupRequirement(expression)) {
    const shouldIncludeChildren =
      includeDependencies && expression.mode !== "none";
    for (const child of expression.children) {
      collectRequirementEdges(
        ownerId,
        child,
        resolved,
        nodeById,
        edgeById,
        shouldIncludeChildren
      );
    }
    return;
  }

  if (!includeDependencies) {
    return;
  }

  if (isFactRequirement(expression)) {
    if (
      expression.operator === "equals" &&
      typeof expression.value === "string"
    ) {
      addEntityDependency(expression.value, ownerId, resolved, edgeById);
    }

    if (
      expression.operator === "atLeast" &&
      typeof expression.value === "number"
    ) {
      addVirtualThresholdDependency(
        expression.fact,
        expression.value,
        ownerId,
        nodeById,
        edgeById
      );
    }

    return;
  }

  if (isEntityRequirement(expression)) {
    addEntityDependency(expression.targetId, ownerId, resolved, edgeById);
  }
}

function isFactRequirement(
  expression: RequirementExpression
): expression is FactRequirement {
  return expression.kind === "fact";
}

function isGroupRequirement(
  expression: RequirementExpression
): expression is GroupRequirement {
  return expression.kind === "group";
}

function isEntityRequirement(
  expression: RequirementExpression
): expression is CustomRequirementExpression & { targetId: string } {
  return (
    expression.kind === entityRequirementKind &&
    typeof expression.targetId === "string"
  );
}

function addEntityDependency(
  sourceId: string,
  ownerId: string,
  resolved: ResolvedBundle,
  edgeById: Map<string, RuntimeEdge>
): void {
  if (!resolved.index.byId.has(sourceId)) {
    return;
  }

  addBidirectionalDependencyEdges(sourceId, ownerId, edgeById);
}

function addVirtualThresholdDependency(
  fact: string,
  value: number,
  ownerId: string,
  nodeById: Map<string, RuntimeNode>,
  edgeById: Map<string, RuntimeEdge>
): void {
  const sourceId = buildVirtualThresholdNodeId(fact, value);
  nodeById.set(sourceId, {
    id: sourceId,
    kind: "virtual-threshold",
    fact,
    operator: "atLeast",
    value
  });

  addBidirectionalDependencyEdges(sourceId, ownerId, edgeById);
}

function addBidirectionalDependencyEdges(
  sourceId: string,
  targetId: string,
  edgeById: Map<string, RuntimeEdge>
): void {
  const requiresEdge = createEdge("requires", sourceId, targetId);
  const requiredByEdge = createEdge("required-by", targetId, sourceId);

  edgeById.set(requiresEdge.id, requiresEdge);
  edgeById.set(requiredByEdge.id, requiredByEdge);
}

function createEdge(type: string, source: string, target: string): RuntimeEdge {
  return {
    id: `${type}:${source}:${target}`,
    source,
    target,
    type
  };
}

function buildVirtualThresholdNodeId(fact: string, value: number): string {
  return `virtual.${sanitizeFactSegment(fact)}.gte.${value}`;
}

function sanitizeFactSegment(fact: string): string {
  return fact
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
}

function compareNodes(left: RuntimeNode, right: RuntimeNode): number {
  return left.id.localeCompare(right.id);
}

function compareEdges(left: RuntimeEdge, right: RuntimeEdge): number {
  return left.id.localeCompare(right.id);
}

function detectCycles(
  nodes: RuntimeNode[],
  edges: RuntimeEdge[]
): RuntimeCycle[] {
  const entityNodeIds = new Set(
    nodes.filter((node) => node.kind === "entity").map((node) => node.id)
  );
  const requiresEdges = edges.filter(
    (edge) =>
      edge.type === "requires" &&
      entityNodeIds.has(edge.source) &&
      entityNodeIds.has(edge.target)
  );
  const adjacency = new Map<string, string[]>();

  for (const nodeId of [...entityNodeIds].sort()) {
    adjacency.set(nodeId, []);
  }

  for (const edge of requiresEdges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  for (const targets of adjacency.values()) {
    targets.sort((left, right) => left.localeCompare(right));
  }

  const stack: string[] = [];
  const onStack = new Set<string>();
  const indexByNode = new Map<string, number>();
  const lowLinkByNode = new Map<string, number>();
  const cycles: RuntimeCycle[] = [];
  let nextIndex = 0;

  for (const nodeId of adjacency.keys()) {
    if (!indexByNode.has(nodeId)) {
      visitNode(nodeId);
    }
  }

  return cycles.sort(compareCycles);

  function visitNode(nodeId: string): void {
    indexByNode.set(nodeId, nextIndex);
    lowLinkByNode.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const targetId of adjacency.get(nodeId) ?? []) {
      if (!indexByNode.has(targetId)) {
        visitNode(targetId);
        lowLinkByNode.set(
          nodeId,
          Math.min(
            lowLinkByNode.get(nodeId) ?? 0,
            lowLinkByNode.get(targetId) ?? 0
          )
        );
      } else if (onStack.has(targetId)) {
        lowLinkByNode.set(
          nodeId,
          Math.min(
            lowLinkByNode.get(nodeId) ?? 0,
            indexByNode.get(targetId) ?? 0
          )
        );
      }
    }

    if (lowLinkByNode.get(nodeId) !== indexByNode.get(nodeId)) {
      return;
    }

    const component: string[] = [];
    let currentNodeId: string | undefined;
    do {
      currentNodeId = stack.pop();
      if (currentNodeId === undefined) {
        break;
      }

      onStack.delete(currentNodeId);
      component.push(currentNodeId);
    } while (currentNodeId !== nodeId);

    component.sort((left, right) => left.localeCompare(right));
    if (component.length > 1 || hasSelfLoop(component[0], requiresEdges)) {
      const componentSet = new Set(component);
      cycles.push({
        nodeIds: component,
        edgeIds: requiresEdges
          .filter(
            (edge) =>
              componentSet.has(edge.source) && componentSet.has(edge.target)
          )
          .map((edge) => edge.id)
          .sort((left, right) => left.localeCompare(right))
      });
    }
  }
}

function hasSelfLoop(
  nodeId: string | undefined,
  edges: RuntimeEdge[]
): boolean {
  return (
    nodeId !== undefined &&
    edges.some((edge) => edge.source === nodeId && edge.target === nodeId)
  );
}

function compareCycles(left: RuntimeCycle, right: RuntimeCycle): number {
  return left.nodeIds.join("|").localeCompare(right.nodeIds.join("|"));
}
