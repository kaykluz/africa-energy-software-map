# Data

This directory contains the canonical taxonomy, contribution/import templates,
candidate imports, interface-snapshot configuration and versioned reviewed
data.

## Current status

The repository does not yet contain a complete census. Reviewed release 0.2.0
contains 1,276 human-reviewed assertions across 64 organisations, 94 products
and 20 country-level deployments, backed by 75 rights-resolved sources. Eleven
candidate records remain held for stronger or accessible evidence.

## Rules

- Stable IDs are permanent.
- Data changes require assertion-level sources.
- Provider claims remain distinct from independent evidence.
- `unknown`, `not_found`, `not_researched`, `not_applicable`, and `confidential`
  are not interchangeable.
- Historical and superseded records remain recoverable.
- Precise sensitive infrastructure coordinates are prohibited.

## Directories

- [`templates/`](templates/) — header-only canonical CSV files
- [`../web/public/downloads/templates/`](../web/public/downloads/templates/) —
  visually validated workbook for private bulk candidate intake
- [`source-register.csv`](source-register.csv) — canonical approved-source list
- [`releases/`](releases/) — immutable reviewed release packages and conventions
- [`release-shards/`](release-shards/) — bounded reviewed deltas awaiting
  independent approval and composition into the next release
- [`research-queue/`](research-queue/) — reviewed leads not yet publishable
- [`imports/`](imports/) — candidate-only migrations from external structured
  sources; not part of a public release
- [`interface-snapshot.json`](interface-snapshot.json) — selected source batch,
  mode, version and generated-output locations
- [`interface-presentation.json`](interface-presentation.json) — editorial
  display metadata kept separate from evidence records
- [`african-countries.json`](african-countries.json) — 54-country navigation
  reference

Table definitions are in [`../schemas/tables.json`](../schemas/tables.json).
The generated snapshot and export contract is documented in
[`../docs/19-snapshot-and-export-pipeline.md`](../docs/19-snapshot-and-export-pipeline.md).
