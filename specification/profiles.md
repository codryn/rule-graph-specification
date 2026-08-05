# Profiles

## Rationale

TTRPG systems differ significantly in ontology and validation needs. Profiles provide the extension mechanism that lets CRGS remain stable while system-specific ecosystems evolve.

## Definition

A Profile declares:

- its identifier and version
- the CRGS specification version it targets
- the extension vocabularies it introduces

## Example

The shipped `Example RPG` profile introduces illustrative entity, effect, requirement, and relationship vocabularies only to exercise the architecture.

## Extension Points

- profile schema layering
- profile-owned vocabularies
- profile-specific validation steps and taxonomy definitions

## Validation Rules

- profiles must declare `id`, `name`, `version`, and `specVersion`
- profiles must declare their extension vocabularies explicitly
- profiles must not alter the meaning of CRGS core fields or version semantics
