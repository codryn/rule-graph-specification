# Codryn Rule Graph Specification

CRGS is an open specification for representing tabletop role-playing game rule systems as typed graph structures.

Version 0.1 establishes the repository foundation for a long-lived standards project. It defines the initial documentation set, the core JSON Schema model, a validation pipeline, and a minimal example profile. It does not attempt to model any complete game system.

## Repository Goals

- clarity
- modularity
- extensibility
- long-term maintainability
- strong typing
- versioning
- reproducibility
- tooling support

## Version 0.1 Scope

- technical specification documents
- architecture and design principles
- JSON Schema Draft 2020-12 definitions
- example profile and reference bundles
- validation tooling skeleton
- contribution and governance documents
- placeholder implementation packages

## Repository Layout

```text
docs/            Architecture and governance documents
specification/   Normative specification chapters
schemas/         JSON Schema definitions split by concern
packages/        Placeholder implementation packages
profiles/        Example and future system profiles
examples/        Reference bundles used for validation
tools/           Repository scripts and validation helpers
.github/         CI and GitHub project automation
```

## Core Concepts

The CRGS core model is intentionally system-neutral. Version 0.1 introduces concepts such as Entity, LocalizedText, SourceReference, RequirementExpression, Effect, Relationship, Metadata, Profile, Manifest, and Bundle.

RPG-specific mechanics belong in profiles. Profiles may extend the core by adding entity types, requirement kinds, effect kinds, relation types, taxonomies, and profile-specific validation constraints, but they must not redefine the semantics of the core.

## Tooling

This repository uses Node.js tooling for validation and project checks.

```bash
npm install
npm run validate
```

`npm run validate` runs the full local repository check: schema validation, linting, tests, and workspace builds.

## Schema URIs

Core CRGS schemas use the specification-versioned base `https://schemas.codryn.com/crgs/v0.1/...`.
Profile-owned schemas use a profile-specific base such as `https://schemas.codryn.com/crgs/profiles/example/v0.1/...`.

The full recommended URI layout is documented in `docs/versioning.md`.

## Status

CRGS is currently at specification version 0.1.0 and should be treated as an initial foundation for iterative refinement toward a stable 1.0 release.
