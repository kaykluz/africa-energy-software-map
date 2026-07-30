# Data

This directory contains the canonical taxonomy, empty contribution/import
templates, and future versioned public data.

## Current status

The repository does not yet contain a verified launch census. Header-only
templates are provided so the schema can be reviewed before records are
imported.

## Rules

- Stable IDs are permanent.
- Data changes require assertion-level sources.
- Provider claims remain distinct from independent evidence.
- `unknown`, `not_found`, `not_researched`, `not_applicable`, and `confidential`
  are not interchangeable.
- Historical and superseded records remain recoverable.
- Precise sensitive infrastructure coordinates are prohibited.

## Directories

- [`templates/`](templates/) — header-only CSV files
- [`source-register.csv`](source-register.csv) — canonical approved-source list
- [`releases/`](releases/) — conventions for future versioned snapshots
- [`research-queue/`](research-queue/) — reviewed leads not yet publishable
- [`imports/`](imports/) — candidate-only migrations from external structured
  sources; not part of a public release

Table definitions are in [`../schemas/tables.json`](../schemas/tables.json).
