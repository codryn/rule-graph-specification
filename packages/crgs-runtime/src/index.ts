export interface RuntimeNode {
  id: string;
  type: string;
}

export interface RuntimeEdge {
  id: string;
  type: string;
  from: string;
  to: string;
}

export interface RuntimeGraph {
  nodes: RuntimeNode[];
  edges: RuntimeEdge[];
}

export function createEmptyRuntimeGraph(): RuntimeGraph {
  return {
    nodes: [],
    edges: []
  };
}
