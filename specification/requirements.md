# Requirements

## Rationale

Rules data needs a declarative way to describe eligibility, prerequisites, or applicability without binding the specification to one execution engine.

## Definition

Version 0.2 defines `RequirementExpression` as either:

- a fact predicate
- a logical group of child expressions

The core supports basic composition through `all`, `any`, and `none` grouping modes.

## Example

```json
{
  "kind": "group",
  "mode": "all",
  "children": [
    {
      "kind": "fact",
      "fact": "selected:ancestry",
      "operator": "equals",
      "value": "ancestry.human"
    },
    {
      "kind": "fact",
      "fact": "profile:demo-mode",
      "operator": "present"
    }
  ]
}
```

## Extension Points

- profile-defined fact namespaces
- additional profile-scoped operators expressed via extended schemas
- richer validator semantics layered above the core

## Validation Rules

- every requirement expression must declare `kind`
- fact requirements must declare an operator
- groups must contain at least one child expression
