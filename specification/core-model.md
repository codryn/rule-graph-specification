# Core Model

## Rationale

The core model should capture stable structural concepts common to many rules systems while leaving domain-specific meaning to profiles.

## Definition

CRGS models rules content as a typed directed graph.

- Entities are nodes.
- Relationships are edges.
- RequirementExpressions guard applicability.
- Effects describe consequences.
- Metadata carries non-semantic annotations.

## Bundle Structure

A bundle is the transport unit for CRGS data. It includes:

- `specVersion`
- `manifest`
- `profile`
- `entities`
- `relationships`
- optional `metadata`

## Extension Points

- entity `type`
- relationship `type`
- requirement facts and group semantics
- effect `type` and operation vocabulary
- metadata attributes

## Validation Rules

- identifiers must be stable strings suitable for cross-reference
- core required fields must be present
- bundle structure must remain profile-independent
- extensions must not shadow or redefine core fields
