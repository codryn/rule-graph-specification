# Effects

## Rationale

Rules content must express consequences such as grants, numeric adjustments, and computed outcomes in a way that remains machine-readable.

## Definition

An Effect describes a typed operation applied to a target. Version 0.1 supports value-based and formula-based representations.

## Example

```json
{
  "type": "increase",
  "target": "resource.points",
  "operation": "increase",
  "value": 1
}
```

## Extension Points

- profile-defined effect types
- profile-specific target taxonomies
- future formula and evaluation models

## Validation Rules

- `type`, `target`, and `operation` are required
- each effect must provide either `value` or `formula`
- effect semantics remain profile-extensible but structurally bounded
