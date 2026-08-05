# Design Principles

## Clarity Over Cleverness

The specification should prefer explicit semantics and predictable encoding patterns over compact but ambiguous representations.

## System Neutrality

The CRGS core must not encode assumptions that only fit one family of tabletop systems. Profiles are the correct home for system-specific mechanics.

## Extensibility With Guardrails

Profiles may add new typed vocabularies and validation rules, but extension points must be explicit and bounded so interoperability remains possible.

## Strong Typing

The repository treats types, identifiers, and schema structure as first-class design concerns. Machine-readable validation is part of the specification surface, not an afterthought.

## Reproducibility

Examples, schemas, and tooling should validate consistently in CI and local environments.

## Versioned Evolution

Specification, profile, and dataset versions are distinct and should be advanced independently according to compatibility rules.

## Toolability

The representation should support validators, editors, visualizers, transformation pipelines, and downstream runtime libraries.

## Long-Term Maintainability

Repository structure, naming, and document boundaries should optimize for a multi-year standards effort rather than a short-lived prototype.
