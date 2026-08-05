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
export type FactRequirement = {
    kind: "fact";
    fact: string;
    operator: "equals" | "atLeast";
    value: string | number | boolean;
} | {
    kind: "fact";
    fact: string;
    operator: "present";
};
export interface GroupRequirement {
    kind: "group";
    mode: "all" | "any" | "none";
    children: RequirementExpression[];
}
export interface CustomRequirementExpression {
    kind: string;
    [key: string]: unknown;
}
export type RequirementExpression = FactRequirement | GroupRequirement | CustomRequirementExpression;
export type Effect = {
    type: string;
    target: string;
    operation: "set" | "increase" | "decrease" | "grant";
    value: string | number | boolean;
} | {
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
export type Relation = Relationship;
export interface ExtensionRegistration {
    id: string;
    schema: string;
    description?: string;
}
export interface ProfileDependency {
    profileId: string;
    versionRange: string;
}
export interface Profile {
    id: string;
    name: string;
    version: string;
    specVersion: string;
    description?: string;
    dependencies?: ProfileDependency[];
    extensions: {
        entityTypes?: ExtensionRegistration[];
        requirementTypes?: ExtensionRegistration[];
        effectTypes?: ExtensionRegistration[];
        relationTypes?: ExtensionRegistration[];
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
export interface EntityIndex {
    byId: Map<string, Entity>;
    outgoingRelations: Map<string, Relation[]>;
    incomingRelations: Map<string, Relation[]>;
}
export interface EvaluatedRequirement {
    requirement: string;
    satisfied: boolean;
    fact?: string;
    operator?: string;
    actualValue?: string | number | boolean;
    expectedValue?: string | number | boolean;
    targetId?: string;
}
export interface MissingRequirement {
    entityId?: string;
    fact?: string;
}
export interface EvaluationResult {
    satisfied: boolean;
    evaluated: EvaluatedRequirement[];
    missing: MissingRequirement[];
}
export interface EvaluationContext {
    facts?: Readonly<Record<string, string | number | boolean | undefined>>;
    entityIds?: Iterable<string>;
    entityIndex?: EntityIndex;
    requirementEvaluators?: Readonly<Record<string, RequirementEvaluator<CustomRequirementExpression>>>;
}
export type RequirementEvaluator<TExpression extends CustomRequirementExpression> = (expression: TExpression, context: EvaluationContext) => EvaluationResult;
export type ResolverIssueCode = "DUPLICATE_ENTITY_ID" | "UNKNOWN_REFERENCED_ENTITY" | "INVALID_PROFILE_NAMESPACE" | "UNSUPPORTED_REQUIREMENT_TYPE" | "INVALID_RELATION_TARGET";
export interface ResolverIssue {
    code: ResolverIssueCode;
    path: string;
    message: string;
}
export interface ResolvedBundle {
    bundle: Bundle;
    index: EntityIndex;
}
export declare class BundleResolutionError extends Error {
    readonly issues: ResolverIssue[];
    constructor(issues: ResolverIssue[]);
}
export declare function resolveBundle(bundle: Bundle): ResolvedBundle;
export declare function evaluate(expression: RequirementExpression, context: EvaluationContext): EvaluationResult;
//# sourceMappingURL=index.d.ts.map