# Feat Model

Each feat entity stores structured PF1e data under `data`.

Required feat data fields:

- `familyId`
- `featTypes`
- `repeatable`

Optional feat data fields:

- `summary`
- `parameter`

Parameterized feats are encoded as concrete feat entities per chosen parameter value. That keeps prerequisite evaluation compatible with the current CRGS subject model, which tracks owned entity IDs directly.
