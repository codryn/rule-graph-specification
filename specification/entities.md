# Entities

## Rationale

Entities provide a uniform way to represent addressable rule concepts without hard-coding specific game mechanics into the core specification.

## Definition

An Entity is a typed node with an identifier and a human-facing label. It may also declare source information, requirements, effects, and metadata.

## Example

```json
{
  "id": "feature.adaptable",
  "type": "trait",
  "label": {
    "default": "Adaptable"
  }
}
```

## Extension Points

- profile-defined entity types
- additional metadata vocabularies
- profile-specific validation that constrains how a given type is used

## Validation Rules

- `id`, `type`, and `label` are required
- `label` must be a valid `LocalizedText`
- referenced requirements and effects must conform to their schemas
