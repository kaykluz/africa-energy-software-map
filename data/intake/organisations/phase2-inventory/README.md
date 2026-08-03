# Phase 2 organisation inventory intake

This directory contains bounded candidate batches derived from the user-supplied
inventory dated 3 August 2026. These records are leads, not public registry
records. They cannot appear on the site until each identity, classification and
material assertion has a direct source and human review.

`batch-001.json` contains the first 25 submitted rows. The complete input parsed
to 264 rows. The reconciliation summary is calculated across the complete input,
but only the bounded candidate slice is committed here.

Conservative matching rules are deliberate:

- exact canonical name, registered alias or official hostname may resolve to an
  existing organisation;
- an exact catalogue name is a lead, not automatically a canonical identity;
- fuzzy similarity never creates a link; and
- rows containing several named parties are marked `needs_split`.

Funds, facilities and programmes are retained as candidate object types rather
than being forced into an organisation record. Acquisitions, mergers, spin-outs,
subsidiaries and affiliates become dated source-linked relationships between
stable organisation IDs.

Regenerate a bounded batch with:

```bash
python3 scripts/prepare_organisation_inventory.py INPUT OUTPUT \
  --batch-id phase2-organisations-002 --start 25 --limit 25
```

Generation does not authorise publication.
