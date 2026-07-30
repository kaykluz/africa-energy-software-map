# Kaykluz starter census workbook migration

Status: **candidate only — not a public release**

This package migrates the external workbook
`kaykluz_africa_energy_software_map_v0_1.xlsx` into the repository data model.
The workbook remains outside Git. Its SHA-256 checksum, row counts, exclusions,
transformation warnings, and review-batch plan are recorded in
`migration-report.json`.

## Publication boundary

Eligible source sheets:

- Organisations
- Products
- Deployments
- Taxonomy, as an input to reviewed mappings
- Research_Queue, as a future candidate queue

Always excluded:

- People — Phase 1 does not publish people profiles
- Submission_Template — contains fields for personal contact information
- Summary and README_Methodology — documentation, not canonical records
- Comparables — product research, not map entities
- Map_Export — derived from Products and Deployments

## Evidence boundary

The workbook word `Verified` is not imported as an editorial verdict.
Evidence is recalculated from source authorship:

- provider-hosted material → `provider_claim_only`;
- DFI or official programme material → `independently_evidenced`;
- customer or utility material → `customer_confirmed` for deployment claims;
- otherwise → `public_source` or an editorial-review warning.

This conversion is deliberately conservative. Human review remains required.

## Stable IDs

Workbook IDs remain traceable through `legacy-id-map.csv`. Canonical IDs convert
uppercase hyphenated identifiers to lowercase underscore identifiers, for
example `ORG-001` → `org_001`.

## Review batching

Each batch is grouped by organisation and is capped at:

- 25 entity records; and
- 100 assertion records.

The first committed batch is a small Nigeria-focused pipeline proof. Later
batches should be generated and reviewed separately.

## Reproduce

```bash
python3 scripts/import_workbook.py \
  /path/to/kaykluz_africa_energy_software_map_v0_1.xlsx \
  --config data/imports/kaykluz-v0.1/mapping.json \
  --review data/imports/kaykluz-v0.1/reviews/batch-001.json \
  --output data/imports/kaykluz-v0.1/generated \
  --full-audit-output data/imports/kaykluz-v0.1/full-audit.json \
  --selected-organisations ORG-001 ORG-002 ORG-003
```

The command refuses to read or emit the People or Submission_Template sheets.
The full audit contains aggregate counts and warnings only; it does not emit the
remaining workbook records.

## Batch 001 research overlay

`reviews/batch-001.json` records the 2026-07-30 AI-assisted source pass. It
contains completed source metadata, exact source locators, field corrections,
assertion-level evidence decisions, source-register candidates and unresolved
questions. It is deliberately marked `ai_researched_human_pending`; it cannot
record a human reviewer or convert the candidate package into a release.
