import { type Bundle, type ResolvedBundle } from "@codryn/crgs-core";
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
export declare function createEmptyRuntimeGraph(): RuntimeGraph;
export declare function buildRuntimeGraph(bundleOrResolved: Bundle | ResolvedBundle): RuntimeGraph;
//# sourceMappingURL=index.d.ts.map