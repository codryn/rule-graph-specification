# Versioning

## Version Domains

CRGS distinguishes three independent version domains.

### Specification Version

The version of the CRGS core specification, including normative semantics and core schemas.

### Profile Version

The version of a profile that extends CRGS. A profile declares the CRGS specification version it targets.

### Dataset Version

The version of a concrete bundle or dataset produced under a profile.

## Semantic Versioning

All three domains use Semantic Versioning.

- Major versions indicate incompatible changes.
- Minor versions indicate backward-compatible additions or clarifications.
- Patch versions indicate compatible fixes, editorial corrections, or non-semantic maintenance.

## Compatibility Rules

1. A profile must declare the CRGS specification version it targets.
2. A dataset must declare the profile it uses and its own dataset version.
3. A profile may tighten validation for its own extension vocabulary, but it must not redefine core semantics.
4. Minor CRGS releases should preserve compatibility for existing valid core documents unless a major version bump is made.
5. Dataset migration rules are profile-specific and may require explicit conversion tooling.
6. Changing or removing a registered extension identifier or its schema contract is a profile compatibility event and must be versioned in the affected profile.
7. Adding or removing a profile dependency changes the active extension registry and must be treated as a profile compatibility decision.

## Schema URI Layout

Recommended schema publication uses versioned paths that distinguish CRGS core schemas from profile-owned schemas.

### CRGS Core

```text
https://schemas.codryn.com/crgs/v0.1/common/metadata.schema.json
https://schemas.codryn.com/crgs/v0.1/entities/entity.schema.json
https://schemas.codryn.com/crgs/v0.1/requirements/expression.schema.json
https://schemas.codryn.com/crgs/v0.1/profile/manifest.schema.json
```

Here `v0.1` is the CRGS specification version.

### Example Profile

```text
https://schemas.codryn.com/crgs/profiles/example/v0.1/profile.schema.json
https://schemas.codryn.com/crgs/profiles/example/v0.1/entities/trait.schema.json
https://schemas.codryn.com/crgs/profiles/example/v0.1/requirements/attribute-score.schema.json
```

Here `v0.1` is the Example Profile version.

### Pathfinder Profile

Future profiles should follow the same split, for example:

```text
https://schemas.codryn.com/crgs/profiles/pf1e/v0.1/profile.schema.json
https://schemas.codryn.com/crgs/profiles/pf1e/v0.1/entities/feat.schema.json
https://schemas.codryn.com/crgs/profiles/pf1e/v0.1/requirements/base-attack-bonus.schema.json
```

### Shadowrun 5 Profile

```text
https://schemas.codryn.com/crgs/profiles/sr5/v0.1/profile.schema.json
https://schemas.codryn.com/crgs/profiles/sr5/v0.1/entities/quality.schema.json
https://schemas.codryn.com/crgs/profiles/sr5/v0.1/mechanics/dice-pool.schema.json
```

## Release Discipline

Normative changes should update the specification version and any affected schema identifiers or package versions as appropriate. Editorial-only changes may remain within the same released specification version until the next formal publication.
