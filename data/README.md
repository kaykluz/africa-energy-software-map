# Data

This directory contains the canonical taxonomy, contribution/import templates,
candidate imports, interface-snapshot configuration and future versioned public
data.

## Current status

The repository does not yet contain a verified launch census. The first
privacy-filtered workbook batch is available as candidate data for interface
and editorial review. It is not a public release.

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
- [`releases/`](releases/) — conventions for future versioned snapshots
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
