import cytoscape, {
  type Core,
  type ElementDefinition,
  type StylesheetStyle
} from "cytoscape";
import elk from "cytoscape-elk";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { LayoutName, ViewerGraphModel } from "../types";

cytoscape.use(elk);

export interface GraphCanvasHandle {
  fit(): void;
  center(id: string): void;
}

interface GraphCanvasProps {
  graph: ViewerGraphModel;
  layout: LayoutName;
  selectedId?: string;
  selectedEdgeId?: string;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  evaluationIds: string[];
  onSelectNode(id: string): void;
  onSelectEdge(id: string): void;
  onClear(): void;
}

const styles: StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      "background-color": "#256b5b",
      color: "#11211e",
      label: "data(label)",
      "font-size": 11,
      "text-wrap": "wrap",
      "text-max-width": "110px",
      "text-valign": "bottom",
      "text-margin-y": 8,
      width: 38,
      height: 38,
      "border-width": 2,
      "border-color": "#f5f1e7"
    }
  },
  {
    selector: "node[kind = 'virtual-threshold']",
    style: {
      shape: "diamond",
      "background-color": "#e1a735",
      width: 30,
      height: 30
    }
  },
  {
    selector: "node[kind = 'unresolved']",
    style: {
      shape: "round-rectangle",
      "background-color": "#fff",
      "border-color": "#b42318",
      "border-style": "dashed"
    }
  },
  {
    selector: "node[status = 'invalid']",
    style: { "border-color": "#b42318", "border-width": 4 }
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#8ba49d",
      "target-arrow-color": "#8ba49d",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      label: "",
      "font-size": 8,
      color: "#49625c",
      "text-background-color": "#f5f1e7",
      "text-background-opacity": 0.85,
      "text-background-padding": "2px"
    }
  },
  {
    selector: "edge[category = 'relationship']",
    style: {
      "line-style": "dashed",
      "line-color": "#a05a2c",
      "target-arrow-color": "#a05a2c"
    }
  },
  {
    selector: "edge[category = 'unresolved']",
    style: {
      "line-style": "dotted",
      "line-color": "#b42318",
      "target-arrow-color": "#b42318"
    }
  },
  {
    selector: ".neighbor",
    style: { "border-color": "#e1a735", "border-width": 5 }
  },
  {
    selector: ".selected",
    style: {
      "background-color": "#f3d67a",
      "border-color": "#11211e",
      "border-width": 5
    }
  },
  {
    selector: "edge.selected, edge:active",
    style: { label: "data(shortType)" }
  },
  {
    selector: ".path",
    style: {
      "background-color": "#d96c3f",
      "line-color": "#d96c3f",
      "target-arrow-color": "#d96c3f",
      width: 5
    }
  },
  {
    selector: ".evaluation",
    style: {
      "border-color": "#b42318",
      "border-style": "double",
      "border-width": 6
    }
  },
  {
    selector: ".cycle",
    style: {
      "background-color": "#b42318",
      "line-color": "#b42318",
      "target-arrow-color": "#b42318"
    }
  },
  { selector: ".faded", style: { opacity: 0.2 } }
];

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);

    useImperativeHandle(ref, () => ({
      fit: () => cyRef.current?.fit(undefined, 40),
      center: (id) => {
        const node = cyRef.current?.getElementById(id);
        if (node?.length)
          cyRef.current?.animate({ center: { eles: node }, duration: 250 });
      }
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const elements: ElementDefinition[] = [
        ...props.graph.nodes.map((node) => ({ data: node })),
        ...props.graph.edges.map((edge) => ({
          data: { ...edge, shortType: edge.relationType.split(".").at(-1) }
        }))
      ];
      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: styles,
        wheelSensitivity: 0.2,
        minZoom: 0.12,
        maxZoom: 3
      });
      cyRef.current = cy;
      cy.on("tap", "node", (event) => props.onSelectNode(event.target.id()));
      cy.on("tap", "edge", (event) => props.onSelectEdge(event.target.id()));
      cy.on("tap", (event) => {
        if (event.target === cy) props.onClear();
      });
      cy.on("mouseover", "node", (event) =>
        event.target.closedNeighborhood().addClass("neighbor")
      );
      cy.on("mouseout", "node", () => cy.elements().removeClass("neighbor"));
      runLayout(cy, props.layout);
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }, [props.graph, props.layout]);

    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.elements().removeClass("selected path evaluation cycle faded");
      if (props.selectedId) {
        const selected = cy
          .getElementById(props.selectedId)
          .addClass("selected");
        selected.neighborhood().addClass("neighbor");
      }
      if (props.selectedEdgeId)
        cy.getElementById(props.selectedEdgeId).addClass("selected");
      props.pathNodeIds.forEach((id) => cy.getElementById(id).addClass("path"));
      props.pathEdgeIds.forEach((id) => cy.getElementById(id).addClass("path"));
      props.evaluationIds.forEach((id) =>
        cy.getElementById(id).addClass("evaluation")
      );
      props.graph.cycles
        .flatMap((cycle) => [...cycle.nodeIds, ...cycle.edgeIds])
        .forEach((id) => cy.getElementById(id).addClass("cycle"));
      if (props.pathNodeIds.length)
        cy.elements().not(".path").addClass("faded");
    }, [
      props.selectedId,
      props.selectedEdgeId,
      props.pathNodeIds,
      props.pathEdgeIds,
      props.evaluationIds,
      props.graph.cycles
    ]);

    return (
      <div
        className="graph-canvas"
        ref={containerRef}
        role="img"
        aria-label={`Dependency graph with ${props.graph.nodes.length} nodes and ${props.graph.edges.length} edges`}
      />
    );
  }
);

function runLayout(cy: Core, layout: LayoutName): void {
  try {
    if (layout === "concentric") {
      cy.layout({
        name: "concentric",
        animate: false,
        fit: true,
        padding: 48
      }).run();
      return;
    }
    if (layout === "compact") {
      cy.layout({ name: "grid", animate: false, fit: true, padding: 48 }).run();
      return;
    }
    cy.layout({
      name: "elk",
      animate: false,
      fit: true,
      padding: 58,
      elk: {
        algorithm: "layered",
        "elk.direction": layout === "left-right" ? "RIGHT" : "DOWN",
        "elk.spacing.nodeNode": 65,
        "elk.layered.spacing.nodeNodeBetweenLayers": 95
      }
    } as cytoscape.LayoutOptions).run();
  } catch {
    cy.layout({
      name: "breadthfirst",
      directed: true,
      fit: true,
      padding: 48
    }).run();
  }
}
