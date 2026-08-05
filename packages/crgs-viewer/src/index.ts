export interface ViewerNode {
  id: string;
  label: string;
  category: string;
}

export interface ViewerEdge {
  id: string;
  source: string;
  target: string;
  category: string;
}

export interface ViewerGraphModel {
  nodes: ViewerNode[];
  edges: ViewerEdge[];
}
