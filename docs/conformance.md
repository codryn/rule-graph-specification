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

## Minimum Conformance for Profiles

A conforming profile must:

1. declare the targeted CRGS version
2. identify its extension vocabularies
3. avoid modifying the semantics of core CRGS fields
4. document additional constraints needed for interoperable use

## Validator Expectations

Reference validators should distinguish between:

- core schema validation failures
- profile-specific validation failures
- unsupported extension vocabulary
- non-fatal warnings for metadata or optional conventions

## Version 0.1 Note

CRGS 0.1 establishes conformance structure and repository validation, but not yet a complete conformance test suite.
