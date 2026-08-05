# Metadata

## Rationale

Datasets often need indexing, provenance, or tooling annotations that should not change the normative meaning of the rules graph.

## Definition

`Metadata` is a bounded object for tags and primitive attributes.

## Example

```json
{
  "tags": ["example", "minimal"],
  "attributes": {
    "reviewed": true,
    "source.kind": "demonstration"
  }
}
```

## Extension Points

- profile-defined metadata conventions
- repository or tool-specific attribute namespaces

## Validation Rules

- metadata is optional
- tags must be unique strings
- metadata must not be used to override normative core semantics
