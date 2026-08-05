import { resolveBundle } from "@codryn/crgs-core";
export function createEmptyRuntimeGraph() {
    return {
        nodes: [],
        edges: [],
        cycles: []
    };
}
const entityRequirementKind = "crgs.requirement.entity";
export function buildRuntimeGraph(bundleOrResolved) {
    const resolved = isResolvedBundle(bundleOrResolved)
        ? bundleOrResolved
        : resolveBundle(bundleOrResolved);
    const graph = createEmptyRuntimeGraph();
    const nodeById = new Map();
    const edgeById = new Map();
    for (const entity of [...resolved.index.byId.values()].sort(compareEntityIds)) {
        nodeById.set(entity.id, {
            id: entity.id,
            kind: "entity",
            entityType: entity.type
        });
        collectRequirementEdges(entity.id, entity.requirements, resolved, nodeById, edgeById);
    }
    graph.nodes = [...nodeById.values()].sort(compareNodes);
    graph.edges = [...edgeById.values()].sort(compareEdges);
    graph.cycles = detectCycles(graph.nodes, graph.edges);
    return graph;
}
function isResolvedBundle(value) {
    return "bundle" in value && "index" in value;
}
function compareEntityIds(left, right) {
    return left.id.localeCompare(right.id);
}
function collectRequirementEdges(ownerId, expression, resolved, nodeById, edgeById, includeDependencies = true) {
    if (!expression) {
        return;
    }
    if (isGroupRequirement(expression)) {
        const shouldIncludeChildren = includeDependencies && expression.mode !== "none";
        for (const child of expression.children) {
            collectRequirementEdges(ownerId, child, resolved, nodeById, edgeById, shouldIncludeChildren);
        }
        return;
    }
    if (!includeDependencies) {
        return;
    }
    if (isFactRequirement(expression)) {
        if (expression.operator === "equals" &&
            typeof expression.value === "string") {
            addEntityDependency(expression.value, ownerId, resolved, edgeById);
        }
        if (expression.operator === "atLeast" &&
            typeof expression.value === "number") {
            addVirtualThresholdDependency(expression.fact, expression.value, ownerId, nodeById, edgeById);
        }
        return;
    }
    if (isEntityRequirement(expression)) {
        addEntityDependency(expression.targetId, ownerId, resolved, edgeById);
    }
}
function isFactRequirement(expression) {
    return expression.kind === "fact";
}
function isGroupRequirement(expression) {
    return expression.kind === "group";
}
function isEntityRequirement(expression) {
    return (expression.kind === entityRequirementKind &&
        typeof expression.targetId === "string");
}
function addEntityDependency(sourceId, ownerId, resolved, edgeById) {
    if (!resolved.index.byId.has(sourceId)) {
        return;
    }
    addBidirectionalDependencyEdges(sourceId, ownerId, edgeById);
}
function addVirtualThresholdDependency(fact, value, ownerId, nodeById, edgeById) {
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
function addBidirectionalDependencyEdges(sourceId, targetId, edgeById) {
    const requiresEdge = createEdge("requires", sourceId, targetId);
    const requiredByEdge = createEdge("required-by", targetId, sourceId);
    edgeById.set(requiresEdge.id, requiresEdge);
    edgeById.set(requiredByEdge.id, requiredByEdge);
}
function createEdge(type, source, target) {
    return {
        id: `${type}:${source}:${target}`,
        source,
        target,
        type
    };
}
function buildVirtualThresholdNodeId(fact, value) {
    return `virtual.${sanitizeFactSegment(fact)}.gte.${value}`;
}
function sanitizeFactSegment(fact) {
    return fact
        .replace(/[^a-zA-Z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .toLowerCase();
}
function compareNodes(left, right) {
    return left.id.localeCompare(right.id);
}
function compareEdges(left, right) {
    return left.id.localeCompare(right.id);
}
function detectCycles(nodes, edges) {
    const entityNodeIds = new Set(nodes.filter((node) => node.kind === "entity").map((node) => node.id));
    const requiresEdges = edges.filter((edge) => edge.type === "requires" &&
        entityNodeIds.has(edge.source) &&
        entityNodeIds.has(edge.target));
    const adjacency = new Map();
    for (const nodeId of [...entityNodeIds].sort()) {
        adjacency.set(nodeId, []);
    }
    for (const edge of requiresEdges) {
        adjacency.get(edge.source)?.push(edge.target);
    }
    for (const targets of adjacency.values()) {
        targets.sort((left, right) => left.localeCompare(right));
    }
    const stack = [];
    const onStack = new Set();
    const indexByNode = new Map();
    const lowLinkByNode = new Map();
    const cycles = [];
    let nextIndex = 0;
    for (const nodeId of adjacency.keys()) {
        if (!indexByNode.has(nodeId)) {
            visitNode(nodeId);
        }
    }
    return cycles.sort(compareCycles);
    function visitNode(nodeId) {
        indexByNode.set(nodeId, nextIndex);
        lowLinkByNode.set(nodeId, nextIndex);
        nextIndex += 1;
        stack.push(nodeId);
        onStack.add(nodeId);
        for (const targetId of adjacency.get(nodeId) ?? []) {
            if (!indexByNode.has(targetId)) {
                visitNode(targetId);
                lowLinkByNode.set(nodeId, Math.min(lowLinkByNode.get(nodeId) ?? 0, lowLinkByNode.get(targetId) ?? 0));
            }
            else if (onStack.has(targetId)) {
                lowLinkByNode.set(nodeId, Math.min(lowLinkByNode.get(nodeId) ?? 0, indexByNode.get(targetId) ?? 0));
            }
        }
        if (lowLinkByNode.get(nodeId) !== indexByNode.get(nodeId)) {
            return;
        }
        const component = [];
        let currentNodeId;
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
                    .filter((edge) => componentSet.has(edge.source) && componentSet.has(edge.target))
                    .map((edge) => edge.id)
                    .sort((left, right) => left.localeCompare(right))
            });
        }
    }
}
function hasSelfLoop(nodeId, edges) {
    return (nodeId !== undefined &&
        edges.some((edge) => edge.source === nodeId && edge.target === nodeId));
}
function compareCycles(left, right) {
    return left.nodeIds.join("|").localeCompare(right.nodeIds.join("|"));
}
//# sourceMappingURL=index.js.map