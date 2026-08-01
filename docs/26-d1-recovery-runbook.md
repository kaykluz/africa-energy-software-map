# D1 recovery runbook

Status: local D1-compatible recovery rehearsal passed; managed Time Travel
exercise remains operator-only

Last updated: 31 July 2026

## Recovery objective

Restore the private operating database without allowing a recovery action to
publish data, expose contact details, or silently lose moderation history. The
public registry remains recoverable from reviewed GitHub releases independently
of D1.

Targets for Phase 1 are:

- recovery point objective: the provider's available point-in-time window;
- recovery time objective: 15 minutes for a small Phase 1 database;
- all ten application tables present;
- `PRAGMA integrity_check` returns `ok`;
- no foreign-key failures;
- contribution contacts remain separate from contribution content; and
- the restored content fingerprint and per-table counts match the selected
  recovery point.

## What is automated in the repository

Run:

```bash
python3 scripts/run_d1_recovery_rehearsal.py \
  --output operations/recovery/latest-local-rehearsal.json
```

The rehearsal applies every checked-in D1 migration to a temporary SQLite
database, seeds synthetic records in all private tables, creates a backup,
simulates destructive loss, restores into a clean database, and compares
integrity, table counts and content fingerprints. Temporary databases are
deleted when the run finishes. It never connects to production and never uses
real contact or review data.

This validates migration compatibility and the application's verification
logic. It does not prove that the Sites-managed production database can be
restored by the current operator.

## Managed D1 Time Travel drill

Cloudflare D1 uses [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
for point-in-time recovery. Current
[Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
support `d1 time-travel info` to obtain a bookmark and
`d1 time-travel restore` to restore by bookmark or timestamp. Retention depends
on the Cloudflare plan and its documented
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/), and must be
recorded from the actual database before launch. A restore changes the selected
database in place, so the first managed exercise must use a disposable D1
database in the same account and region.

Required access, held outside this repository:

- Cloudflare account and D1 database identifiers;
- a short-lived token scoped to the disposable D1 database; and
- an operator who can create and remove the disposable database.

The Sites deployment currently exposes only the logical `DB` binding. Wrangler
is not authenticated in the project environment, so a managed restore cannot be
performed safely from this repository session.

### Disposable database procedure

1. Record operator, start time, Cloudflare plan, region and expected retention.
2. Create a disposable D1 database; do not copy production contact data into it.
3. Apply `web/drizzle/*.sql` in order and insert synthetic sentinel rows only.
4. Run `wrangler d1 time-travel info <database> --json` and store the bookmark in
   the private incident record, never in GitHub.
5. Record table counts, integrity result and a non-reversible content
   fingerprint.
6. Delete or alter the sentinel rows and confirm the health check detects the
   loss.
7. Restore the pre-loss bookmark with
   `wrangler d1 time-travel restore <database> --bookmark <bookmark> --json`.
8. Verify table counts, referential integrity, audit events, bulk rows, bulk
   decisions, promoted assertions, contact separation and the original
   fingerprint.
9. Record elapsed time and the `previous_bookmark` returned by the restore. That
   bookmark is the rollback point for an accidental restore.
10. Remove the disposable database and revoke the short-lived token.

### Production incident procedure

1. Pause intake in `/review` while keeping public read access available.
2. Record the incident time, suspected loss boundary and current health summary.
3. Obtain current and target bookmarks. A second operator checks the target.
4. Restore only after the owner confirms the exact database and timestamp.
5. Verify all invariants above before resuming intake.
6. Re-run retention maintenance immediately. A restore can make previously
   purged contact rows recoverable inside the provider window.
7. Notify affected contributors when the privacy incident procedure requires it.

Never export private D1 data to GitHub Actions artefacts, pull requests, issue
comments or repository files. Any encrypted off-platform backup needs a separate
retention and access-control review.

## Exit criteria

The recovery item in issue #14 can close only when the disposable managed drill
has passed, the production recovery window is confirmed, evidence is stored in
the private operations record, and a second operator has reviewed the result.
