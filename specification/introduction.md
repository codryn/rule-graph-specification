# Introduction

## Rationale

Tabletop role-playing game rules are typically published as prose, spreadsheets, ad hoc JSON, or application-specific databases. These formats are difficult to validate, compare, transform, and reuse across tools.

CRGS defines a system-neutral graph representation intended to support long-term interoperability between validators, converters, rules engines, editors, and viewers.

## Scope

CRGS defines:

- a typed graph-oriented core model
- serialization constraints expressed in JSON Schema
- an extension model based on profiles
- versioning and conformance expectations

CRGS does not define a complete ontology for any single game system in version 0.2.

## Non-Goals

- full system data for Pathfinder, Shadowrun, or other games
- copyrighted game text
- user interface conventions
- executable gameplay semantics for every possible rule system

## Example

A trait entity may grant another entity when a requirement expression is satisfied. This pattern can represent many systems without assuming any one system's mechanics.
