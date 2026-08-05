# Extension Model

## Overview

CRGS is designed to be extended by profiles. A profile supplies additional vocabularies and constraints while remaining compatible with CRGS core semantics.

## Permitted Profile Extensions

- new entity types
- new requirement types or fact namespaces
- new effect types
- new relationship types
- taxonomies and classification vocabularies
- profile-scoped validation rules

## Forbidden Profile Behavior

- changing the meaning of core fields
- redefining CRGS version semantics
- weakening the identifier model in a way that breaks interoperability
- embedding copyrighted rule text as part of the core project assets

## Extension Strategy

Profiles extend by declaration, not mutation. A profile declares the additional types it introduces as explicit registration objects, and the bundle states which single root profile it conforms to.

## Registration Model

- Extension types are strings, not entities.
- A registration entry binds one extension identifier to one schema URI.
- Entity, effect, and relation instances resolve registrations through their `type` field.
- Requirement instances resolve registrations through their `kind` field when `kind` is not one of the core kinds `fact` or `group`.

## Identifier Model

Custom extension identifiers must use the pattern `<namespace>.<category>.<name>`.

- `namespace` is profile-owned and prevents collisions across ecosystems.
- `category` is one of `entity`, `requirement`, `effect`, or `relation`.
- `name` is profile-defined and stable within that namespace.

Examples:

- `example.entity.ability`
- `example.requirement.attribute-rating`
- `example.relation.unlocks`

## Validator Resolution

A profile-aware validator should:

1. Load the bundle's root profile.
2. Resolve its transitive `dependencies` graph.
3. Merge all extension registrations into one active registry.
4. Reject duplicate identifiers across the merged registry.
5. When a data object contains a non-core `type` or `kind`, look up the exact identifier in the active registry and validate the object against the registered schema URI.

## Unknown Extension Policy

Unknown non-core extension identifiers are not allowed. If an entity, effect, relation, or requirement uses a non-core identifier that is not present in the active registry, validation must fail.

## Dependencies And Composition

- A profile may depend on other profiles using `dependencies` entries with `profileId` and `versionRange`.
- Dependencies import extension registries; they do not permit rewriting core semantics.
- CRGS does not permit bundles to activate multiple unrelated profiles side by side.
- Multi-profile behavior is expressed only through the dependency closure of the bundle's single root profile.

## Forward Compatibility

The core schema structure intentionally uses typed identifiers, reusable metadata, and separate relation vocabularies so future profiles such as Pathfinder 1e, Shadowrun 5, D&D 5e, Pathfinder 2e, and Savage Worlds can be modeled without changing the meaning of core nodes and edges.
