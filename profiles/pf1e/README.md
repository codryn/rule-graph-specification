# Pathfinder First Edition Profile

This profile introduces the first executable Pathfinder First Edition slice for CRGS.

The `0.1.0` milestone is intentionally narrow. It covers feat prerequisites, typed feats, source references, localization, and a small parameterized feat surface that can already pass through `validate`, `build`, and `graph`.

## Scope

- ability-score prerequisites
- base attack bonus prerequisites
- character-level and class-level fact vocabulary
- skill-rank vocabulary
- feat chains
- parameterized feats
- repeatable feats
- source references
- localized labels and summaries

## Modeling Notes

Parameterized feat families are represented as concrete feat entities per selected value. For example, `Weapon Focus` and `Spell Focus` are encoded as feat entities with explicit parameter values such as `longsword` or `evocation`.

That tradeoff keeps the current CRGS `0.2.0` evaluator and graph builder usable without adding instance-level selection state to the core subject model.

## Compatibility Notes

The repository currently derives profile namespaces from profile IDs such as `example.profile.demo`. For that reason this profile uses the ID `pf1e.profile.pathfinder-first-edition` instead of the more vendor-qualified form proposed in the planning prompt.
