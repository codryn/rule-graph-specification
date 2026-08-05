# Relations

## Rationale

Not every dependency or association should be embedded directly inside an entity. Explicit graph edges improve traceability and transformation.

## Definition

A Relationship is a typed directed edge from one entity identifier to another.

## Example

```json
{
  "id": "rel.human-grants-adaptable",
  "type": "example.relation.grants",
  "from": "ancestry.human",
  "to": "feature.adaptable"
}
```

## Extension Points

- profile-defined relationship types
- profile-specific edge semantics
- metadata-based edge annotations

## Validation Rules

- `id`, `type`, `from`, and `to` are required
- referenced endpoints must use valid identifiers
- profile semantics may constrain which entity types are legal endpoints
