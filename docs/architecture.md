# Architecture

## Purpose

CRGS is organized as a layered standards repository rather than a single executable project. The architecture separates normative semantics, machine-readable schemas, illustrative data, and future implementation surfaces.

## Layers

1. Specification documents define meaning, constraints, and extension boundaries.
2. JSON Schemas define structural validation for serializations.
3. Profiles extend the core with system-specific vocabularies.
4. Example datasets exercise the specification and validation pipeline.
5. Packages provide future implementation entry points without locking the specification to one runtime.

## Repository Roles

- `docs/` contains architectural and governance material.
- `specification/` contains the normative chapters for CRGS itself.
- `schemas/` contains reusable JSON Schema Draft 2020-12 fragments.
- `profiles/` contains profile definitions that extend but do not rewrite the core.
- `examples/` contains reference bundles used by validation and tests.
- `packages/` contains placeholder code surfaces for future tooling.
- `tools/` contains repository-level scripts.

## Data Model Boundaries

The core model defines a graph-oriented representation with typed nodes and edges. Core semantics must remain system-neutral. System-specific abstractions such as a class system, sanity mechanic, or attack progression belong to profiles and data, not to the core.

## Reference Flow

```mermaid
flowchart LR
  Spec[specification/] --> Schemas[schemas/]
  Schemas --> Examples[examples/]
  Profiles[profiles/] --> Examples
  Schemas --> Validator[tools and packages/crgs-validator]
  Spec --> Packages[packages/*]
```

## Package Intent

- `crgs-core` defines shared data structures and identifiers.
- `crgs-schema` packages published schema assets.
- `crgs-validator` hosts validation APIs.
- `crgs-cli` exposes repository and validation commands.
- `crgs-runtime` provides future graph loading and traversal primitives.
- `crgs-viewer` defines future viewer-facing interfaces.

## Stability Strategy

Version 0.1 establishes the boundaries. Later work should refine semantics by extending schemas and documents incrementally rather than collapsing layers or embedding profile logic into the core.
