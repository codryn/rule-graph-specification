# Extension Model

## Overview

CRGS is designed to be extended by profiles. A profile supplies additional vocabularies and constraints while remaining compatible with CRGS core semantics.

## Permitted Profile Extensions

- new entity types
- new requirement types or fact namespaces
- new effect types
- new relationship types
- taxonomies and classification vocabularies
- profile-scoped validation rules

## Forbidden Profile Behavior

- changing the meaning of core fields
- redefining CRGS version semantics
- weakening the identifier model in a way that breaks interoperability
- embedding copyrighted rule text as part of the core project assets

## Extension Strategy

Profiles should extend by declaration, not mutation. A profile declares the additional types it introduces and the bundle states which profile it conforms to.

## Forward Compatibility

The core schema structure intentionally uses typed identifiers, reusable metadata, and separate relation vocabularies so future profiles such as Pathfinder 1e, Shadowrun 5, D&D 5e, Pathfinder 2e, and Savage Worlds can be modeled without changing the meaning of core nodes and edges.
