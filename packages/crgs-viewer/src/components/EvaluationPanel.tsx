import type { Entity } from "@codryn/crgs-core";
import type { EvaluationState, SubjectDocument } from "../types";

export function EvaluationPanel({
  entity,
  subject,
  evaluation,
  onEvaluate,
  onSelect
}: {
  entity?: Entity;
  subject?: SubjectDocument;
  evaluation?: EvaluationState;
  onEvaluate(): void;
  onSelect(id: string): void;
}) {
  return (
    <section className="diagnostic-content" aria-label="Requirement evaluation">
      <div className="diagnostic-header">
        <div>
          <span className="eyebrow">Runtime semantics</span>
          <h2>Subject evaluation</h2>
        </div>
        <button
          className="primary-button"
          disabled={!entity || !subject}
          onClick={onEvaluate}
        >
          Evaluate selected target
        </button>
      </div>
      {!subject && (
        <p className="muted">
          Load a subject JSON document to evaluate the selected target.
        </p>
      )}
      {subject && !evaluation && (
        <p className="muted">
          Subject loaded with {subject.entityIds?.length ?? 0} entities and{" "}
          {Object.keys(subject.facts ?? {}).length} facts.
        </p>
      )}
      {evaluation && (
        <div
          className={`evaluation-result ${evaluation.result.satisfied ? "passed" : "failed"}`}
        >
          <h3>
            {entity?.label.default ?? evaluation.entityId}:{" "}
            {evaluation.result.satisfied ? "Satisfied" : "Not satisfied"}
          </h3>
          <div className="evaluation-grid">
            <div>
              <strong>Evaluated</strong>
              <ul>
                {evaluation.result.evaluated.map((item, index) => (
                  <li
                    key={index}
                    className={item.satisfied ? "passed" : "failed"}
                  >
                    <span>{item.satisfied ? "PASS" : "FAIL"}</span>
                    {item.targetId ? (
                      <button
                        className="link-button"
                        onClick={() => onSelect(item.targetId!)}
                      >
                        {item.targetId}
                      </button>
                    ) : (
                      `${item.fact ?? item.requirement} ${item.operator ?? ""} ${item.expectedValue ?? ""}`
                    )}
                    {item.actualValue !== undefined && (
                      <small>actual: {String(item.actualValue)}</small>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Missing</strong>
              {evaluation.result.missing.length ? (
                <ul>
                  {evaluation.result.missing.map((item, index) => (
                    <li key={index}>
                      <span>MISS</span>
                      {item.entityId ? (
                        <button
                          className="link-button"
                          onClick={() => onSelect(item.entityId!)}
                        >
                          {item.entityId}
                        </button>
                      ) : (
                        item.fact
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>None</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
