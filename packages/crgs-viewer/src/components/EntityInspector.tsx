import type { Bundle, Entity } from "@codryn/crgs-core";
import { dependencyIds, localizedLabel } from "../services/viewer-service";
import type {
  ViewerEdgeData,
  ViewerGraphModel,
  ViewerNodeData
} from "../types";
import { RawJsonView } from "./RawJsonView";
import { RequirementTree } from "./RequirementTree";

interface EntityInspectorProps {
  bundle: Bundle;
  graph: ViewerGraphModel;
  entity?: Entity;
  node?: ViewerNodeData;
  edge?: ViewerEdgeData;
  language: string;
  onSelect(id: string): void;
}

export function EntityInspector(props: EntityInspectorProps) {
  if (props.edge)
    return (
      <aside className="inspector panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Graph element</span>
            <h2>Edge</h2>
          </div>
        </div>
        <dl className="detail-list">
          <dt>Relation</dt>
          <dd>{props.edge.relationType}</dd>
          <dt>Source</dt>
          <dd>
            <button
              className="link-button"
              onClick={() => props.onSelect(props.edge!.source)}
            >
              {props.edge.source}
            </button>
          </dd>
          <dt>Target</dt>
          <dd>
            <button
              className="link-button"
              onClick={() => props.onSelect(props.edge!.target)}
            >
              {props.edge.target}
            </button>
          </dd>
          <dt>Role</dt>
          <dd>{props.edge.logicalRole ?? "relationship"}</dd>
          <dt>Origin</dt>
          <dd>{props.edge.origin}</dd>
        </dl>
        <RawJsonView value={props.edge} />
      </aside>
    );
  if (!props.entity)
    return (
      <aside className="inspector panel">
        <div className="empty-state">
          <span className="eyebrow">Inspector</span>
          <h2>{props.node?.label ?? "No selection"}</h2>
          <p>
            {props.node
              ? `${props.node.kind} · ${props.node.status}`
              : "Select an entity or graph edge to inspect its CRGS source."}
          </p>
          {props.node && <RawJsonView value={props.node} />}
        </div>
      </aside>
    );
  const entity = props.entity;
  const directPrerequisites = dependencyIds(
    props.graph,
    entity.id,
    "prerequisites",
    false
  );
  const transitivePrerequisites = dependencyIds(
    props.graph,
    entity.id,
    "prerequisites",
    true
  );
  const directDependents = dependencyIds(
    props.graph,
    entity.id,
    "dependents",
    false
  );
  const transitiveDependents = dependencyIds(
    props.graph,
    entity.id,
    "dependents",
    true
  );
  const outgoing = props.bundle.relationships.filter(
    (relationship) => relationship.from === entity.id
  );
  const incoming = props.bundle.relationships.filter(
    (relationship) => relationship.to === entity.id
  );
  const languages = Object.keys(entity.label?.translations ?? {});
  return (
    <aside className="inspector panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Entity inspector</span>
          <h2>
            {localizedLabel(entity.label, props.language, undefined, entity.id)}
          </h2>
        </div>
        <span className={`state-badge ${props.node?.status}`}>
          {props.node?.status ?? "valid"}
        </span>
      </div>
      <section>
        <h3>Identity</h3>
        <dl className="detail-list">
          <dt>Canonical ID</dt>
          <dd>
            <code>{entity.id}</code>
          </dd>
          <dt>Type</dt>
          <dd>{entity.type}</dd>
          <dt>Namespace</dt>
          <dd>{entity.id.split(".")[0]}</dd>
          <dt>Schema version</dt>
          <dd>{props.bundle.specVersion}</dd>
          <dt>Profile owner</dt>
          <dd>{props.bundle.profile.id}</dd>
        </dl>
      </section>
      <section>
        <h3>Localization</h3>
        <dl className="detail-list">
          <dt>Default label</dt>
          <dd>{entity.label?.default ?? "Not supplied"}</dd>
          <dt>Languages</dt>
          <dd>{languages.length ? languages.join(", ") : "Default only"}</dd>
          <dt>Aliases</dt>
          <dd>
            {Array.isArray(entity.data?.aliases)
              ? entity.data.aliases.join(", ")
              : "None"}
          </dd>
        </dl>
      </section>
      <section>
        <h3>Prerequisite expression</h3>
        {entity.requirements ? (
          <RequirementTree
            expression={entity.requirements}
            onSelect={props.onSelect}
          />
        ) : (
          <p className="muted">No prerequisites.</p>
        )}
      </section>
      <section>
        <h3>Dependencies</h3>
        <DependencyGroup
          title="Direct prerequisites"
          ids={directPrerequisites}
          onSelect={props.onSelect}
        />
        <DependencyGroup
          title="Transitive prerequisites"
          ids={transitivePrerequisites}
          onSelect={props.onSelect}
        />
        <DependencyGroup
          title="Direct dependents"
          ids={directDependents}
          onSelect={props.onSelect}
        />
        <DependencyGroup
          title="Transitive dependents"
          ids={transitiveDependents}
          onSelect={props.onSelect}
        />
      </section>
      <section>
        <h3>Relationships</h3>
        {[...outgoing, ...incoming].length ? (
          <ul className="relationship-list">
            {[...outgoing, ...incoming].map((relation) => (
              <li key={relation.id}>
                <span>{relation.type.split(".").at(-1)}</span>
                <button
                  className="link-button"
                  onClick={() =>
                    props.onSelect(
                      relation.from === entity.id ? relation.to : relation.from
                    )
                  }
                >
                  {relation.from === entity.id
                    ? `→ ${relation.to}`
                    : `← ${relation.from}`}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No explicit relationships.</p>
        )}
      </section>
      <section>
        <h3>Source and metadata</h3>
        <dl className="detail-list">
          <dt>Status</dt>
          <dd>{props.node?.status ?? "valid"}</dd>
          <dt>Tags</dt>
          <dd>{entity.metadata?.tags?.join(", ") ?? "None"}</dd>
          <dt>Source</dt>
          <dd>
            {entity.source
              ? `${entity.source.title}: ${entity.source.citation}`
              : "Not supplied"}
          </dd>
        </dl>
      </section>
      <RawJsonView value={entity} title="Raw entity JSON" />
    </aside>
  );
}

function DependencyGroup({
  title,
  ids,
  onSelect
}: {
  title: string;
  ids: string[];
  onSelect(id: string): void;
}) {
  return (
    <div className="dependency-group">
      <strong>
        {title} <span>{ids.length}</span>
      </strong>
      {ids.length ? (
        <ul>
          {ids.map((id) => (
            <li key={id}>
              <button className="link-button" onClick={() => onSelect(id)}>
                {id}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>None</p>
      )}
    </div>
  );
}
