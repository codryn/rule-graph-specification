import type { EntitySummary } from "../types";

interface EntityBrowserProps {
  entities: EntitySummary[];
  selectedId?: string;
  type: string;
  namespace: string;
  flags: Set<string>;
  allTypes: string[];
  allNamespaces: string[];
  onType(value: string): void;
  onNamespace(value: string): void;
  onFlag(value: string): void;
  onSelect(id: string): void;
}

export function EntityBrowser(props: EntityBrowserProps) {
  return (
    <aside className="entity-browser panel" aria-label="Entity browser">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Bundle index</span>
          <h2>Entities</h2>
        </div>
        <span className="count">{props.entities.length}</span>
      </div>
      <div className="filter-grid">
        <label>
          Type
          <select
            value={props.type}
            onChange={(event) => props.onType(event.target.value)}
          >
            <option value="">All types</option>
            {props.allTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Namespace
          <select
            value={props.namespace}
            onChange={(event) => props.onNamespace(event.target.value)}
          >
            <option value="">All namespaces</option>
            {props.allNamespaces.map((namespace) => (
              <option key={namespace}>{namespace}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="filter-flags">
        {[
          ["prerequisites", "Has prerequisites"],
          ["dependents", "Has dependents"],
          ["invalid", "Invalid"],
          ["unresolved", "Unresolved"],
          ["isolated", "Isolated"]
        ].map(([value, label]) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={props.flags.has(value)}
              onChange={() => props.onFlag(value)}
            />
            {label}
          </label>
        ))}
      </div>
      <ul className="entity-list">
        {props.entities.map((summary) => (
          <li key={summary.entity.id}>
            <button
              className={summary.entity.id === props.selectedId ? "active" : ""}
              onClick={() => props.onSelect(summary.entity.id)}
              aria-current={summary.entity.id === props.selectedId}
            >
              <span
                className={`entity-state ${summary.invalid ? "invalid" : summary.unresolved ? "unresolved" : "valid"}`}
              >
                {summary.invalid ? "!" : summary.unresolved ? "?" : "✓"}
              </span>
              <span className="entity-copy">
                <strong>{summary.label}</strong>
                <code>{summary.entity.id}</code>
                <small>
                  {summary.entity.type.split(".").at(-1)} ·{" "}
                  {summary.prerequisiteIds.length} req ·{" "}
                  {summary.dependentIds.length} dep
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
