# PF1e Profile Initialization Prompt

Implement the first executable Pathfinder First Edition profile slice for this CRGS monorepo.

Work inside this repository and make the smallest coherent end-to-end change set that introduces a new profile at `profiles/pf1e`.

## Goal

Create `CRGS Pathfinder 1e Profile v0.1` as a real vertical slice, not a placeholder. The result must validate, build, and graph through the existing CLI.

## Scope

Model only these concepts in PF1e `0.1.0`:

- ability scores
- base attack bonus
- character level
- class level
- skill ranks
- feats
- feat types
- feat prerequisites
- `AND` / `OR` expressions using CRGS core requirement groups
- parameterized feats
- repeatable feats
- source references
- localization

Do not attempt to model anything outside that scope.

## Reference Feats

Use this initial feat set:

- Power Attack
- Cleave
- Great Cleave
- Combat Expertise
- Improved Trip
- Greater Trip
- Dodge
- Mobility
- Spring Attack
- Weapon Focus
- Weapon Specialization
- Spell Focus
- Greater Spell Focus

This slice must cover:

- ability-score prerequisites
- base attack bonus prerequisites
- class-level prerequisites
- feat prerequisites
- branched feat chains
- multiple prerequisites in the same feat
- parameter selections such as weapon or spell school
- same-selection follow-up feats such as `Spell Focus` -> `Greater Spell Focus`
- feat typing for Fighter bonus feats

## Repository Constraints

Match the current repository conventions rather than inventing a new profile format.

- Use the existing CRGS `0.2.0` core shape already used by `profiles/example`.
- Profile manifests in this repo currently use `specVersion`, `extensions`, and optional `dependencies`.
- Do not introduce a new top-level `requires` field unless you also extend the core profile schema and all affected tooling. For this milestone, stay compatible with the current schema.
- `crgs validate <directory>` only validates files that already exist as `profile.json` and `bundle.json` inside the target directory.
- `crgs build <directory>` resolves `bundle.json` from that directory.
- `crgs graph <bundle>` expects a built bundle artifact.

## Required Output Structure

Create at least this structure:

```text
profiles/
  pf1e/
    README.md
    profile.json
    bundle.json
    specification/
      introduction.md
      entity-types.md
      requirements.md
      feat-model.md
      selections.md
      identifiers.md
    schemas/
      entities/
        feat.schema.json
        class.schema.json
        skill.schema.json
        source.schema.json
      requirements/
        ability-score.schema.json
        base-attack-bonus.schema.json
        character-level.schema.json
        class-level.schema.json
        skill-ranks.schema.json
        feat.schema.json
      selections/
        entity-selection.schema.json
    taxonomies/
      abilities.json
      feat-types.json
      skills.json
    examples/
      valid/
      invalid/
```

If tests or fixtures need additional files, add them.

## Schema URI Convention

Use profile-owned schema URIs in this form:

```text
https://schemas.codryn.com/crgs/profiles/pf1e/v0.1/entities/feat.schema.json
https://schemas.codryn.com/crgs/profiles/pf1e/v0.1/requirements/base-attack-bonus.schema.json
```

Use namespaced extension identifiers rooted in `pf1e`, consistent with the repository's current profile manifest rules.

Examples:

- `pf1e.entity.feat`
- `pf1e.entity.class`
- `pf1e.entity.skill`
- `pf1e.entity.source`
- `pf1e.requirement.ability-score`
- `pf1e.requirement.base-attack-bonus`
- `pf1e.requirement.character-level`
- `pf1e.requirement.class-level`
- `pf1e.requirement.skill-ranks`
- `pf1e.requirement.feat`

## Profile Manifest Requirements

Create a valid `profiles/pf1e/profile.json` compatible with the current core schema. It must explicitly target CRGS core `0.2.0` via `specVersion: "0.2.0"`.

Use this semantic intent, adapted to the current manifest schema:

```json
{
  "id": "codryn.crgs.profile.pf1e",
  "name": "Pathfinder First Edition",
  "version": "0.1.0",
  "specVersion": "0.2.0"
}
```

Add an appropriate `description` and all required `extensions` registrations.

## Data Modeling Guidance

Model feats as entities.

At minimum, a feat entity should support:

- localized name via core `label`
- optional localized description or summary if the current entity shape permits it
- feat type tags or references
- optional parameterization metadata for feats such as `Weapon Focus` and `Spell Focus`
- optional repeatability metadata
- optional source reference metadata
- CRGS requirement expressions for prerequisites

Use CRGS core requirement groups for `AND` / `OR` composition whenever possible. Only create PF1e-specific atomic requirement types for the PF1e-specific facts being checked.

Prefer schemas that validate structure cleanly without encoding the entire game system.

## Suggested Initial Dataset

Include a minimal but executable PF1e bundle in `profiles/pf1e/bundle.json` containing:

- profile manifest inline as required by the CRGS bundle schema
- feat entities for the reference feat set
- supporting entities for at least the Fighter class, relevant skills, spell schools, and sources as needed by the feat slice
- requirement expressions on the feat entities
- any supporting relations only if they add real value beyond prerequisite expressions

Keep identifiers deterministic and documented in `specification/identifiers.md`.

## Acceptance Tests

Add or extend tests so these cases are covered:

- `Power Attack` requires Strength 13 and BAB +1
- `Cleave` requires `Power Attack`
- `Great Cleave` requires `Cleave`
- `Weapon Specialization` requires Fighter level 4
- `Greater Spell Focus` requires `Spell Focus` with the same school selection
- cycles are rejected
- unknown feat references are rejected
- invalid selections are rejected

Use the existing test style in `tests/` and existing resolver / graph / evaluator helpers where practical.

## Validation and Tooling Updates

Update repository validation so the new profile participates in automated checks.

At minimum, adjust any affected tests or validation scripts so the repository recognizes:

- `profiles/pf1e/profile.json`
- `profiles/pf1e/bundle.json`
- any new valid or invalid example fixtures you add

Preserve existing behavior for the example profile and current conformance suite.

## Definition of Done

The milestone is complete when these commands succeed:

```text
crgs validate profiles/pf1e

crgs build profiles/pf1e --output dist/pf1e.bundle.json

crgs graph dist/pf1e.bundle.json --output dist/pf1e.graph.json
```

And the PF1e-focused tests pass.

## Non-Goals

Do not add:

- all feats
- spells
- archetypes
- prestige classes
- class feature substitutions
- counts-as rule coverage beyond what this slice strictly needs
- mythic rules
- complete rules text
- automatic effect calculation

## Implementation Style

- Keep the change set minimal but executable.
- Follow existing repository formatting and schema conventions.
- Prefer root-cause support in schemas, fixtures, and tests over hard-coded special cases.
- If a proposed modeling idea conflicts with the current CRGS core shape, choose the simpler compatible approach and document the tradeoff in `profiles/pf1e/README.md`.
