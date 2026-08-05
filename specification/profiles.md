# Profiles

## Rationale

TTRPG systems differ significantly in ontology and validation needs. Profiles provide the extension mechanism that lets CRGS remain stable while system-specific ecosystems evolve.

## Definition

A Profile declares:

- its identifier and version
- the CRGS specification version it targets
- the extension registries it owns
- any dependent profiles whose registries are imported transitively

Extension registrations are string identifiers, not entities. Each registration binds a namespaced identifier to the schema URI a profile-aware validator must use when it encounters that identifier in data.

Bundles declare exactly one root profile. Multiple profiles are combined only by resolving that root profile's dependency graph; CRGS does not allow an arbitrary unordered list of active profiles inside a bundle.

## Example

```json
{
  "id": "example.profile.demo",
  "name": "Example RPG",
  "version": "0.1.0",
  "specVersion": "0.1.0",
  "extensions": {
    "entityTypes": [
      {
        "id": "example.entity.ability",
        "schema": "https://example.crgs.dev/schema/entities/ability.schema.json"
      }
    ],
    "requirementTypes": [
      {
        "id": "example.requirement.attribute-rating",
        "schema": "https://example.crgs.dev/schema/requirements/attribute-rating.schema.json"
      },
      {
        "id": "example.requirement.skill-rating",
        "schema": "https://example.crgs.dev/schema/requirements/skill-rating.schema.json"
      }
    ],
    "relationTypes": [
      {
        "id": "example.relation.unlocks",
        "schema": "https://example.crgs.dev/schema/relations/unlocks.schema.json"
      }
    ]
  }
}
```

## Extension Points

- profile schema layering
- profile-owned vocabularies
- profile-specific validation steps and taxonomy definitions

## Validation Rules

- profiles must declare `id`, `name`, `version`, and `specVersion`
- profiles must declare their extension registries explicitly using namespaced string identifiers
- extension identifiers must follow `<namespace>.<category>.<name>` and use one of the extension categories `entity`, `requirement`, `effect`, or `relation`
- validators must resolve profile dependencies before validation and build one active extension registry from the root profile plus its transitive dependencies
- duplicate extension identifiers across that registry are invalid and must be rejected rather than overridden
- unknown non-core extension identifiers are not allowed during profile-aware validation
- profiles must not alter the meaning of CRGS core fields or version semantics
