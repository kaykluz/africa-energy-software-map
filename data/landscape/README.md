# Inclusive landscape catalogue

This catalogue is the map's broad, inclusion-first index. It records names and
categorisations supplied to the project without turning every listing into a
verified product, deployment or lifecycle claim.

## What a listing means

- A listing means that the name has been submitted to the project.
- `status_as_submitted`, descriptions and geography are retained as submitted.
- A listing does not establish a deployment, operating status or independent
  verification.
- A link to a reviewed record is included when the name already exists in the
  versioned registry.
- Reported deployments and company-history events use their own record types so
  they cannot be counted by the evidenced deployment map.

This separation makes the project useful as both a broad directory and a
source-linked research dataset. Nothing is removed merely because evidence is
incomplete; the interface simply says which layer the record belongs to.

## Shards

The files in `shards/` follow the pull-request limit of 25 entity changes. Empty
numbered shards are intentional: each can be populated in an independently
reviewable follow-up without changing the interface code.

The public interface imports every catalogue shard and offers filtered CSV and
JSON exports. The schema lives at
[`../../schemas/landscape-catalogue.schema.json`](../../schemas/landscape-catalogue.schema.json).

## Publication boundary

Catalogue imports use an explicit public-field allowlist. Free-form research
notes, confidence scores, contributor relationships and other private editorial
metadata are not stored in these shards, included in site exports or sent to the
application database. Repository validation blocks common private-editorial
phrasing if it appears in a public catalogue record.

The Phase 1 CSV import is reproducible with
`scripts/import_phase1_landscape.py`. Its source workbooks stay outside the
repository; generated shards retain the public factual metadata, categories and
source links needed by the catalogue.
