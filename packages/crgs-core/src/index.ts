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

export interface Profile {
  id: string;
  name: string;
  version: string;
  specVersion: string;
  description?: string;
  extensions: {
    entityTypes?: string[];
    requirementTypes?: string[];
    effectTypes?: string[];
    relationshipTypes?: string[];
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
