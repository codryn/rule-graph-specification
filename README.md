# Codryn Rule Graph Specification

CRGS is an open specification for representing tabletop role-playing game rule systems as typed graph structures.

Version 0.2 extends the repository foundation with an executable reference slice. It includes the core JSON Schema model, repository validation pipeline, conformance fixtures, and a profile-backed end-to-end example that remains intentionally smaller than a complete game system.

## Repository Goals

- clarity
- modularity
- extensibility
- long-term maintainability
- strong typing
- versioning
- reproducibility
- tooling support

## Version 0.2 Scope

- technical specification documents
- architecture and design principles
- JSON Schema Draft 2020-12 definitions
- executable example profile and reference bundles
- conformance fixtures and deterministic graph output
- validation, evaluation, and graph-building reference tooling
- contribution and governance documents
- workspace packages for CLI, core resolution, runtime graphing, schema assets, and validation surfaces

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

The CRGS core model is intentionally system-neutral. Version 0.2 includes concepts such as Entity, LocalizedText, SourceReference, RequirementExpression, Effect, Relationship, Metadata, Profile, Manifest, and Bundle.

RPG-specific mechanics belong in profiles. Profiles may extend the core by adding entity types, requirement kinds, effect kinds, relation types, taxonomies, and profile-specific validation constraints, but they must not redefine the semantics of the core.

## Tooling

This repository uses Node.js tooling for validation and project checks.

```bash
npm install
npm run validate
npm run ci
npm run ci:exact
```

`npm run validate` runs the full local repository check: schema validation, linting, tests, and workspace builds.

`npm run ci` runs the same repository checks as the GitHub Actions workflow without reinstalling dependencies first. It is the recommended pre-push command for local use.

`npm run ci:exact` mirrors the current GitHub Actions CI job order exactly: `npm ci`, `npm run format:check`, `npm run lint`, `npm run validate`, `npm test`, and `npm run build`.

The CLI can run the same repository-wide validation pipeline:

```bash
crgs validate --repo
```

`crgs validate --repo` and `npm run validate` execute the same underlying repository validation steps.

The conformance suite also has a dedicated entrypoint:

```bash
npm run test:conformance
```

## CLI

The workspace includes a CRGS CLI package with a `crgs` command.

### Local Usage Without Installation

Build the workspace first, then invoke the generated CLI directly:

```bash
npm run build
node packages/crgs-cli/dist/index.js validate profiles/example
```

You can also invoke the package bin through npm:

```bash
npm exec --workspace @codryn/crgs-cli crgs -- validate profiles/example
```

### Install As a Local Command

To make `crgs` available in your shell on the current machine, link the CLI package globally from the repository:

```bash
npm run build
npm link --workspace @codryn/crgs-cli
```

After linking, the command is available as:

```bash
crgs validate profiles/example
```

To remove the global link later:

```bash
npm unlink -g @codryn/crgs-cli
```

### Commands

The current CLI surface is:

- `crgs validate <path>`
- `crgs validate --repo`
- `crgs build <path> --output <file>`
- `crgs graph <bundle> --output <file>`
- `crgs evaluate --bundle <bundle> --subject <subject> --target <entity-id>`

`validate` accepts either a CRGS document file or a directory containing `profile.json` and/or `bundle.json`.
`validate --repo` runs the same full repository validation pipeline as `npm run validate`.

### End-to-End Example

The example profile now provides an executable reference slice that can be run through the full pipeline:

```bash
crgs validate profiles/example
crgs build profiles/example --output dist/example.bundle.json
crgs graph dist/example.bundle.json --output dist/example.graph.json
crgs evaluate --bundle dist/example.bundle.json --subject examples/characters/example-hero.json --target example.ability.battle-mage
```

This example answers several reference questions directly from the generated bundle and graph:

- prerequisites for an ability
- entities unlocked by an ability
- whether a sample character configuration satisfies a target ability
- a graph path from current state to a target ability
- invalid references through conformance cases
- cycle detection in prerequisite graphs

## Schema URIs

Core CRGS schemas use the specification-versioned base `https://schemas.codryn.com/crgs/v0.2/...`.
Profile-owned schemas use a profile-specific base such as `https://schemas.codryn.com/crgs/profiles/example/v0.2/...`.

The full recommended URI layout is documented in `docs/versioning.md`.

## Status

CRGS is currently at specification version 0.2.0 and should be treated as an initial foundation for iterative refinement toward a stable 1.0 release.
