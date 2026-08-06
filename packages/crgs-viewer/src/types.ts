import type {
  Bundle,
  Entity,
  EvaluationResult,
  RequirementExpression
} from "@codryn/crgs-core";
import type { RuntimeGraph } from "@codryn/crgs-runtime";

export type Severity = "error" | "warning" | "info";
export type LayoutName =
  "hierarchical" | "left-right" | "compact" | "concentric";

export interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
  entityId?: string;
  referenceTarget?: string;
  elementId?: string;
}

export interface ViewerNodeData {
  id: string;
  label: string;
  shortId: string;
  kind: "entity" | "virtual-threshold" | "unresolved";
  entityType: string;
  namespace: string;
  status: "valid" | "invalid" | "unresolved";
}

export interface ViewerEdgeData {
  id: string;
  source: string;
  target: string;
  relationType: string;
  category: "prerequisite" | "relationship" | "generated" | "unresolved";
  logicalRole?: string;
  origin: "generated" | "explicit" | "loaded";
}

export interface ViewerGraphModel {
  nodes: ViewerNodeData[];
  edges: ViewerEdgeData[];
  cycles: RuntimeGraph["cycles"];
}

export interface SubjectDocument {
  entityIds?: string[];
  facts?: Record<string, string | number | boolean>;
}

export interface ViewerDocument {
  bundle: Bundle;
  graph: ViewerGraphModel;
  diagnostics: Diagnostic[];
  validationValid: boolean;
}

export interface EntitySummary {
  entity: Entity;
  label: string;
  namespace: string;
  prerequisiteIds: string[];
  dependentIds: string[];
  invalid: boolean;
  unresolved: boolean;
}

export interface EvaluationState {
  entityId: string;
  result: EvaluationResult;
}

export interface PathResult {
  startId: string;
  targetId: string;
  nodeIds: string[];
  edgeIds: string[];
  found: boolean;
}

export interface RequirementBranch {
  expression: RequirementExpression;
  role: "required" | "alternative" | "excluded";
}
