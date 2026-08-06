import ELK from "elkjs/lib/elk-api.js";
import elkWorkerUrl from "elkjs/lib/elk-worker.js?url";
import type cytoscape from "cytoscape";
import type { ElkNode } from "elkjs/lib/elk-api.js";

type LayoutNode = {
  _cyEle: cytoscape.NodeSingular;
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: LayoutNode[];
  layoutOptions?: Record<string, string>;
};

type LayoutEdge = {
  _cyEle: cytoscape.EdgeSingular;
  id: string;
  sources: string[];
  targets: string[];
};

type LayoutGraph = {
  id: string;
  children: LayoutNode[];
  edges: LayoutEdge[];
  layoutOptions?: Record<string, string>;
};

type ElkLayoutOptions = {
  cy: cytoscape.Core;
  eles: cytoscape.CollectionReturnValue;
  fit?: boolean;
  padding?: number;
  nodeDimensionsIncludeLabels?: boolean;
  transform?: (
    node: cytoscape.NodeSingular,
    position: { x: number; y: number }
  ) => { x: number; y: number };
  nodeLayoutOptions?:
    | ((node: cytoscape.NodeSingular) => Record<string, string> | undefined)
    | undefined;
  elk?: Record<string, string | undefined>;
};

const defaults = {
  nodeDimensionsIncludeLabels: false,
  fit: true,
  padding: 20,
  animate: false,
  animateFilter: () => true,
  animationDuration: 500,
  animationEasing: undefined,
  transform: (
    _node: cytoscape.NodeSingular,
    position: { x: number; y: number }
  ) => position,
  ready: undefined,
  stop: undefined,
  nodeLayoutOptions: undefined,
  elk: {
    algorithm: undefined
  }
};

class ElkLayout {
  private readonly options: ElkLayoutOptions;

  constructor(options: ElkLayoutOptions) {
    const elkOptions = options.elk;
    const { cy } = options;

    this.options = {
      ...defaults,
      ...options,
      elk: {
        ...defaults.elk,
        ...elkOptions,
        aspectRatio: String(cy.width() / cy.height())
      }
    };
  }

  run(): this {
    const { options } = this;
    const nodes = options.eles.nodes();
    const edges = options.eles.edges();
    const elk = new ELK({ workerUrl: elkWorkerUrl });
    const graph = makeGraph(nodes, edges, options);
    graph.layoutOptions = compactOptions(options.elk);

    void elk
      .layout(graph as ElkNode)
      .then(() => {
        (
          nodes.filter((node) => !node.isParent()) as unknown as {
            layoutPositions(
              layout: unknown,
              layoutOptions: ElkLayoutOptions,
              position: (node: cytoscape.NodeSingular) => {
                x: number;
                y: number;
              }
            ): void;
          }
        ).layoutPositions(this, options, (node) => getPosition(node, options));
      })
      .finally(() => {
        elk.terminateWorker();
      });

    return this;
  }

  stop(): this {
    return this;
  }

  destroy(): this {
    return this;
  }
}

function makeGraph(
  nodes: cytoscape.NodeCollection,
  edges: cytoscape.EdgeCollection,
  options: ElkLayoutOptions
): LayoutGraph {
  const elkNodes: LayoutNode[] = [];
  const elkEdges: LayoutEdge[] = [];
  const elementLookup = new Map<string, LayoutNode | LayoutEdge>();
  const graph: LayoutGraph = {
    id: "root",
    children: [],
    edges: []
  };

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const layoutNode = makeNode(node, options);
    elkNodes.push(layoutNode);
    elementLookup.set(node.id(), layoutNode);
  }

  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const layoutEdge = makeEdge(edge);
    elkEdges.push(layoutEdge);
    elementLookup.set(edge.id(), layoutEdge);
  }

  for (const layoutNode of elkNodes) {
    const node = layoutNode._cyEle;
    if (!node.isChild()) {
      graph.children.push(layoutNode);
      continue;
    }

    const parent = node.parent();
    const parentNode = parent[0];
    const parentLayout = parentNode
      ? elementLookup.get(parentNode.id())
      : undefined;
    if (
      parentLayout &&
      "_cyEle" in parentLayout &&
      parentLayout._cyEle.isNode()
    ) {
      const container = parentLayout as LayoutNode;
      container.children = container.children ?? [];
      container.children.push(layoutNode);
    }
  }

  graph.edges.push(...elkEdges);
  return graph;
}

function makeNode(
  node: cytoscape.NodeSingular,
  options: ElkLayoutOptions
): LayoutNode {
  const layoutNode: LayoutNode = {
    _cyEle: node,
    id: node.id(),
    layoutOptions: options.nodeLayoutOptions?.(node) ?? undefined
  };

  if (!node.isParent()) {
    const dimensions = node.layoutDimensions(options);
    const position = node.position();
    layoutNode.x = position.x - dimensions.w / 2;
    layoutNode.y = position.y - dimensions.h / 2;
    layoutNode.width = dimensions.w;
    layoutNode.height = dimensions.h;
  }

  node.scratch("elk", layoutNode);
  return layoutNode;
}

function makeEdge(edge: cytoscape.EdgeSingular): LayoutEdge {
  const layoutEdge: LayoutEdge = {
    _cyEle: edge,
    id: edge.id(),
    sources: [edge.data("source")],
    targets: [edge.data("target")]
  };

  edge.scratch("elk", layoutEdge);
  return layoutEdge;
}

function getPosition(
  node: cytoscape.NodeSingular,
  options: ElkLayoutOptions
): { x: number; y: number } {
  const dimensions = node.layoutDimensions(options);
  let parent = node.parent();
  const scratch = node.scratch("elk") as LayoutNode;
  const position = {
    x: scratch.x ?? 0,
    y: scratch.y ?? 0
  };

  while (parent.nonempty()) {
    const parentNode = parent[0];
    if (!parentNode) {
      break;
    }

    const parentScratch = parentNode.scratch("elk") as LayoutNode;
    position.x += parentScratch.x ?? 0;
    position.y += parentScratch.y ?? 0;
    parent = parent.parent();
  }

  position.x += dimensions.w / 2;
  position.y += dimensions.h / 2;
  return options.transform?.(node, position) ?? position;
}

const register = (cy: typeof cytoscape | undefined): void => {
  if (!cy) {
    return;
  }

  cy("layout", "elk", ElkLayout);
};

function compactOptions(
  input: Record<string, string | undefined> | undefined
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

export default register;
