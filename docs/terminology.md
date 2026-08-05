# Terminology

## Core Terms

### Entity

A typed node in the rule graph. Entities represent addressable concepts such as traits, selections, resources, or capabilities.

### Relationship

A typed directed edge between entities. Relationships capture non-embedded graph structure such as grants, dependencies, containment, or references.

### RequirementExpression

A declarative predicate that must evaluate successfully for a rule or entity to apply.

### Effect

A declarative statement describing a state change, grant, or computed consequence.

### LocalizedText

A language-aware text container with a required default rendering and optional locale-specific translations.

### SourceReference

Structured provenance metadata pointing to the origin of information.

### Metadata

Non-semantic annotations used for indexing, tooling, classification, or provenance.

### Profile

An extension surface that introduces additional vocabularies and constraints for a specific game system or rules family.

### Manifest

Top-level bundle identification and dataset versioning metadata.

### Bundle

A transport unit containing a manifest, a profile declaration, entities, relationships, and optional metadata.

## Version Terms

### Specification Version

The version of CRGS core semantics and documents.

### Profile Version

The version of a profile definition layered on top of a specific CRGS version.

### Dataset Version

The version of a concrete bundle or corpus encoded using a profile.
