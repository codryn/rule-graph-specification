# Schema Identifiers and Versioning

Core schemas:

`https://schemas.codryn.com/crgs/v0.2/...`

Profile schemas:

`https://schemas.codryn.com/crgs/profiles/{profile}/v0.2/...`

- Versioned URIs are immutable.
- `latest` is never used as a canonical `$id`.
- Schemas are resolved locally during validation.
- Public hosting is added before the first stable release.
