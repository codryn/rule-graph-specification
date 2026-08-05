# Conformance

## Conformance Targets

CRGS expects several classes of conforming artifacts.

- specification documents
- profiles
- bundles and datasets
- validators
- producer tooling
- consumer tooling

## Minimum Conformance for Bundles

A conforming bundle must:

1. declare a CRGS specification version
2. include a valid manifest
3. declare the profile it uses
4. validate against the applicable CRGS core schema set
5. satisfy any additional profile rules
6. use only core or registry-declared extension identifiers from the active profile dependency closure

## Minimum Conformance for Profiles

A conforming profile must:

1. declare the targeted CRGS version
2. identify its extension registries and the schema URI for each registered identifier
3. avoid modifying the semantics of core CRGS fields
4. document additional constraints needed for interoperable use
5. declare profile dependencies explicitly when imported registries are required

## Validator Expectations

Reference validators should distinguish between:

- core schema validation failures
- profile-specific validation failures
- unsupported extension vocabulary
- unknown extension identifiers
- duplicate registry identifiers across profile dependencies
- non-fatal warnings for metadata or optional conventions

## Version 0.2 Note

CRGS 0.2 establishes conformance structure, repository validation, and an executable reference conformance suite, but it still stops short of a full game-system profile library.
