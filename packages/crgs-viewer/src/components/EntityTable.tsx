import type { EntitySummary } from "../types";

export function EntityTable({
  entities,
  selectedId,
  onSelect
}: {
  entities: EntitySummary[];
  selectedId?: string;
  onSelect(id: string): void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Type</th>
            <th>Namespace</th>
            <th>Prerequisites</th>
            <th>Dependents</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((summary) => (
            <tr
              key={summary.entity.id}
              className={summary.entity.id === selectedId ? "selected-row" : ""}
              onClick={() => onSelect(summary.entity.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSelect(summary.entity.id);
              }}
            >
              <td>{summary.label}</td>
              <td>
                <code>{summary.entity.id}</code>
              </td>
              <td>{summary.entity.type}</td>
              <td>{summary.namespace}</td>
              <td>{summary.prerequisiteIds.length}</td>
              <td>{summary.dependentIds.length}</td>
              <td>
                {summary.invalid
                  ? "Invalid"
                  : summary.unresolved
                    ? "Unresolved"
                    : "Valid"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
