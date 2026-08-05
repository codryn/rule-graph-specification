# Contributing

CRGS is a specification project. Contributions should improve clarity, interoperability, and long-term maintainability.

## Contribution Types

- normative specification text
- architecture and terminology improvements
- JSON Schema changes
- validation and tooling improvements
- example data that remains system-neutral or demonstrative
- process, governance, and conformance material

## Non-Goals for Contributions

- copyrighted rules text
- complete implementations of existing RPG systems
- profile proposals that alter CRGS core semantics
- UI-heavy work unrelated to specification conformance

## Working Rules

1. Keep changes narrow and well-scoped.
2. Separate editorial cleanup from semantic changes when practical.
3. When changing semantics, update the relevant files under `docs/`, `specification/`, `schemas/`, and `examples/` together.
4. Add or update validation artifacts when schema behavior changes.
5. Preserve backward compatibility within a released major specification version unless a breaking change is explicitly approved.

## Local Checks

```bash
npm install
npm run validate
```

`npm run validate` runs the full local check sequence used for repository verification: schema validation, linting, tests, and workspace builds.

## Pull Requests

Each pull request should state:

- the problem being addressed
- whether the change is normative or editorial
- impacted schemas or examples
- compatibility implications
- any unresolved design questions

## Decision Standard

Specification changes should be judged by interoperability value, clarity of semantics, extension safety, and migration cost.
