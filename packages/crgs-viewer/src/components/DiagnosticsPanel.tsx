import type { Diagnostic } from "../types";

export function DiagnosticsPanel({
  diagnostics,
  onSelect
}: {
  diagnostics: Diagnostic[];
  onSelect(diagnostic: Diagnostic): void;
}) {
  return (
    <section className="diagnostic-content" aria-label="Validation diagnostics">
      <div className="diagnostic-header">
        <div>
          <span className="eyebrow">Validation and consistency</span>
          <h2>
            Diagnostics <span className="count">{diagnostics.length}</span>
          </h2>
        </div>
      </div>
      {diagnostics.length === 0 ? (
        <div className="diagnostic-empty">
          <strong>No findings</strong>
          <span>The bundle is schema-valid, resolved, and acyclic.</span>
        </div>
      ) : (
        <ul className="diagnostic-list">
          {diagnostics.map((item, index) => (
            <li key={`${item.code}:${item.path}:${index}`}>
              <button onClick={() => onSelect(item)}>
                <span className={`severity ${item.severity}`}>
                  {item.severity}
                </span>
                <code>{item.code}</code>
                <strong>{item.message}</strong>
                <small>
                  {item.path}
                  {item.entityId ? ` · ${item.entityId}` : ""}
                  {item.referenceTarget
                    ? ` · target ${item.referenceTarget}`
                    : ""}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
