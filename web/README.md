# Africa Energy Software Map web prototype

Responsive Phase 1 interface for the public registry. Its version 2 direction
combines a visual Explore mode, an interactive Map and a precise Data workspace,
with detail revealed progressively through search, previews and full records.

The implementation contract is
[`docs/17-visual-interaction-redesign.md`](../docs/17-visual-interaction-redesign.md).
Growth and data-boundary rules are in
[`docs/18-expansion-architecture-and-roadmap.md`](../docs/18-expansion-architecture-and-roadmap.md).

The interface currently renders reviewed data release **0.2.0**.
Products, organisations, deployments and downloads are generated together from
one checksum-verified release; they are not duplicated in UI components. See the
[snapshot and export pipeline](../docs/19-snapshot-and-export-pipeline.md).

## Run locally

```bash
npm ci
npm run dev
```

## Validate

```bash
npm run lint
npm test
```

`npm test` builds the production worker and checks server-rendered content for
the Stack, Directory, Data, product and country profiles, search, and the
methodology AI disclosure. It also exercises contribution storage, private
receipt lookup, origin and sensitive-data rejection, rate limiting, reviewer
authorisation, decision auditing, conflict handling, contact isolation, and
safe review export against an in-memory SQLite database using the real
migrations. The operations checks cover scheduled retention, queue health,
authenticated pause/resume, and fail-closed automation access.

## Contribution storage

Completed contribution forms are written to the hosted D1 database through the
logical `DB` binding. The schema and generated migration live in `db/` and
`drizzle/`. Regenerate a migration after an intentional schema change with:

```bash
npm run db:generate
```

Contact email is not saved in the browser draft and is stored in a separate
table with a 150-day live deletion date. This keeps total recoverability within
180 days when the managed D1 recovery window is included. Public registry data
and downloads never query the intake tables. See the
[contribution intake and moderation contract](../docs/21-contribution-intake-and-moderation.md).

## Private review workspace

`/review` is the admin sign-in route. It lets an authorised editor review
candidate assertions, resolve source rights, triage incoming contributions, and
decide bulk candidates batch by batch. It writes decisions and audit events to
D1; it cannot update the public registry or publish a release.

Reviewers must be signed in and included in the comma-separated
`REVIEWER_EMAILS` runtime variable. Copy `.dev.vars.example` to an ignored local
environment file when developing. Apply all migrations in `drizzle/` before
using the workspace against a new database.

The complete access, decision, privacy, export, and promotion procedure is in
the [review workspace contract](../docs/22-review-workspace.md).

## Safe automation

The daily maintenance endpoint requires the private `OPERATIONS_TOKEN`; the
reviewer Operations tab uses the existing allowlist. Repository automation
prepares source-grouped review prompts, a bounded Batch 002 research plan, and a
dry-run research report. None of these paths can edit the public registry or
publish a release.

Run the complete preparation checks from the repository root:

```bash
python3 scripts/build_review_assist.py --check
python3 scripts/prepare_next_batch.py --check
python3 scripts/run_agent_dry_run.py
python3 scripts/check_launch_readiness.py
python3 scripts/validate_repository.py
```

Production secrets, scheduling, retention, and failure handling are described
in [Automation and review assist](../docs/23-automation-and-review-assist.md).

## Bulk intake

The private Bulk tab downloads and accepts the standard `.xlsx` workbook.
Parsing happens in the reviewer’s browser; the server receives and revalidates
at most 100 structured rows. Accepted uploads remain private candidate records
and are automatically planned into review-size batches. Reviewers can Accept,
Amend, Reject or request More evidence for each row. Accepted or amended rows
create atomic assertions in the private Assertions queue; they do not enter the
public registry until the separate review and release gates pass.

The template is published at
`/downloads/templates/africa-energy-software-map-bulk-import.xlsx`. Validate its
structure with:

```bash
python3 scripts/validate_bulk_template.py
```

Company geography, e-mobility, sector classification and import boundaries are
defined in
[Sector, geography and bulk intake](../docs/24-sector-geography-and-bulk-intake.md).

To regenerate or verify the interface data before running the web checks:

```bash
python3 scripts/build_registry_snapshot.py
python3 scripts/build_registry_snapshot.py --check
```

## Product principles

- evidence wording stays visible where claims appear;
- provider claims never become evidenced deployments;
- Stack, Deployments and Directory use one filter vocabulary;
- category and country previews stay bounded as the registry grows;
- the Directory pages the full filtered set at 25, 50 or 100 rows;
- exports state the visible record set and prototype status;
- country views avoid precise non-public infrastructure coordinates;
- browsing, search, export and correction require no account; and
- no autonomous process can publish without human editorial review.
