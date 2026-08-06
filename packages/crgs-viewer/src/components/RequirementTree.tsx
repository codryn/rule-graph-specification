import type { RequirementExpression } from "@codryn/crgs-core";
import { requirementText } from "../services/viewer-service";

interface RequirementTreeProps {
  expression: RequirementExpression;
  onSelect?(id: string): void;
}

export function RequirementTree({
  expression,
  onSelect
}: RequirementTreeProps) {
  const isGroup =
    expression.kind === "group" &&
    Array.isArray((expression as { children?: unknown }).children);
  const target = (expression as unknown as { targetId?: unknown }).targetId;
  const targetId = typeof target === "string" ? target : undefined;
  return (
    <div className="requirement-node">
      <div className={`requirement-label ${isGroup ? "operator" : "leaf"}`}>
        {targetId && onSelect ? (
          <button className="link-button" onClick={() => onSelect(targetId)}>
            {requirementText(expression)}
          </button>
        ) : (
          requirementText(expression)
        )}
      </div>
      {isGroup && (
        <div className="requirement-children">
          {(expression as { children: RequirementExpression[] }).children.map(
            (child, index) => (
              <RequirementTree
                key={index}
                expression={child}
                onSelect={onSelect}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
