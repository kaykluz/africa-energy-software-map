# Review workspace

## Purpose

`/review` is the private editorial workspace for the first candidate-data
batch and incoming community contributions. It gives an authorised reviewer one
place to inspect evidence, record a decision, resolve source rights, and manage
the intake queue.

The workspace records editorial decisions. It does not edit the public registry,
generate a release, or publish a contribution. A reviewed item still requires a
normal repository change and pull-request review before it can appear in the
public map or downloads.

## Access

Review access has two independent gates:

1. the person must be signed in through ChatGPT authentication; and
2. the normalised email address must appear in the comma-separated
   `REVIEWER_EMAILS` runtime variable.

The allowlist fails closed. If the variable is missing or empty, nobody can use
the workspace. Public routes do not inherit this restriction.

Example local setting:

```text
REVIEWER_EMAILS=editor@example.org,second-editor@example.org
```

Production values are managed in the hosting environment, not committed to the
repository. Adding or removing a reviewer requires an explicit environment
change and a new deployment.

## Workspace layout

The top strip answers five questions at a glance:

- how many assertions have a recorded decision;
- how many sources have a rights decision;
- how many contributions need attention; and
- whether contribution intake is active or paused; and
- whether the candidate batch is released.

The release indicator stays **Held** until the included assertions and sources
are complete. There is intentionally no publish button. When it changes to
**Ready**, it applies only to assertions and sources
included in the package. Candidate rows marked More evidence or Reject remain
outside that release and their count stays visible beside the Ready state.

Six tabs divide the work:

| Tab | Use |
| --- | --- |
| Assertions | Review one atomic candidate claim against its linked source |
| Sources | Record rights, licence treatment, and source independence |
| Organisations | Reconcile and decide every inclusion-catalogue listing |
| Contributions | Triage private public submissions and inspect their supplied evidence |
| Bulk | Import, check and decide workbook candidates batch by batch |
| Operations | Check retention runs and pause or resume contribution intake |

On a wide screen, the queue remains on the left and the selected record opens on
the right. On a small screen, the same information becomes a single vertical
flow. Search and status filters narrow the queue without changing the underlying
data.

## Reviewing an assertion

1. Select an assertion from the queue.
2. Read the claim, entity context, source summary, and exact locator.
3. Open the source in a new tab and inspect the relevant passage.
4. Confirm that the source supports the precise claim.
5. Check for sensitive infrastructure or personal information.
6. Choose one decision:

| Decision | Meaning | Required fields |
| --- | --- | --- |
| Accept | The candidate value is supported as written | Source and safety checks |
| Amend | A different value is supported | Proposed value, note, source and safety checks |
| Reject | The claim should not enter the registry | Note, source and safety checks |
| Needs evidence | The current source is insufficient | Research note |

The evidence label may be changed only as part of a recorded proposal. Changing
it does not convert a provider claim into independent evidence without a source
that justifies the change.

Each save records reviewer identity, time, decision details, and a version
number. If a stale screen tries to overwrite a newer decision, the API returns a
conflict and the reviewer must refresh.

Clearing a decision removes the current assertion decision but writes a
`review_cleared` event to the append-only audit history.

Assertions are grouped by source so reviewers can inspect one source once and
work through its linked claims together. A compact preparation strip flags
rights questions, provider-authored material, missing locators, human-only
sources, and possible safety language. These are deterministic prompts for the
reviewer, not AI verdicts: they cannot accept, amend, reject, or publish a claim.

## Reviewing a source

Every source should receive a rights decision:

- **Resolved** — rights treatment is known and a licence/treatment value is
  recorded;
- **Needs research** — the source can be inspected, but rights or attribution
  still need work; or
- **Exclude** — the source should not be used in the release.

The reviewer also records whether the source is independent, provider-authored,
customer-authored, or otherwise unclassified. A resolved source cannot retain an
unknown licence value.

Source decisions do not copy source text into the registry. They record the
permission and attribution treatment for factual use and linking.

## Moderating contributions

The queue shows submission content without exposing the contributor’s email or
receipt secret. The source URL must be treated as untrusted and opened with care.

The workspace can move a contribution through these private moderation states:

```text
received → triaged → researching → needs_evidence → reviewed
         → accepted
         → rejected
         → duplicate
         → withdrawn
```

Every state change requires a reason and creates an audit event. `accepted`
means the proposal may be translated into a repository data change. It does not
publish anything. `published` is deliberately unavailable in the workspace.

Private contact email is revealed only after an explicit click. The response is
not included in the normal workspace payload, and each reveal creates an audit
event without copying the email into that event. The live deletion date is shown
beside the email; it is set at 150 days so managed recovery history cannot push
potential contact retention past 180 days.

## Reviewing the organisation catalogue

The Organisations tab contains every row in the inclusion-first research
catalogue, including rows already reconciled to reviewed profiles and rows still
awaiting review. Search and filters cover status, actor role and energy market;
the queue is server-paginated so the 1,953-record dataset is not loaded into the
browser at once.

Each candidate presents the submitted identity, parent or group, actor roles,
energy markets, headquarters, documented country coverage, technology labels,
status, source basis, confidence, review date and direct source URL. A reviewer
chooses one of five decisions:

| Decision | Meaning |
| --- | --- |
| Accept | Publish the reviewed listing as a live canonical organisation profile |
| Amend | Publish a canonical profile using the recorded corrected values |
| More evidence | The candidate remains listed but cannot be promoted from the current source |
| Duplicate | The identity should be reconciled to another record rather than created again |
| Reject | The row should not enter the canonical registry |

Accept and Amend require the reviewer to confirm that the source was opened,
the identity was checked, roles and markets were checked, and the record is safe
to publish. Amendments are stored separately from the immutable imported row.
All other decisions require a note. Decisions are versioned and auditable.
Accept and Amend immediately materialise a stable canonical ID, profile URL and
directory record from the immutable listing plus its reviewed amendments.
Reject and More evidence do not create a canonical record; Duplicate resolves
to an existing identity rather than creating one.

Live canonical materialisation is distinct from an immutable GitHub data
release. The review record remains the D1 source of truth until a bounded data
pull request snapshots the accepted record into the repository release tables.

## Operations

The Operations tab shows the latest maintenance run, expired-contact count,
open contribution count, and age of the oldest open item. An allowlisted
reviewer can pause or resume new contribution intake by entering a reason.
Changes use optimistic version checks and create append-only audit events.

Pausing intake affects only new genuine submissions. It does not remove public
data, delete existing contributions, block receipt lookups, or interrupt
review. The honeypot response remains deliberately indistinguishable to simple
bots. There is no public operations control.

## Bulk intake

The Bulk tab provides the standard workbook and accepts up to 100 populated
rows at a time. The browser reads the `Bulk Records` sheet locally and submits
structured rows only. The server repeats every validation, splits the work into
review-size batches, stores each row as a private candidate, and writes an audit
event.

The raw workbook is not stored. A workbook fingerprint prevents accidental
duplicate imports. The imported payload for each row remains immutable; review
decisions and amendments are stored separately.

Select a numbered batch, open a candidate and check the direct source. The
server removes fragments and common tracking parameters from public HTTP(S)
links and rejects local or private addresses. The reviewer must still open the
page and confirm that it is direct, supports the record and is safe to publish.
URL normalisation is not evidence verification.

Each row has four decisions:

| Decision | Result |
| --- | --- |
| Accept | Keep the candidate as supplied and create atomic review assertions |
| Amend | Store the stated field changes and create assertions from the effective row |
| Reject | Retain the audit record but create no assertions |
| More evidence | Hold the row with a required research note and create no assertions |

An accepted row cannot contain silent field edits; choose **Amend** for any
content change. Accept and Amend require all four source/safety confirmations.
Reject and More evidence require a note. Optimistic version checks stop one
browser session overwriting another.

Promotion creates source-linked organisation, product and deployment
assertions in the normal Assertions tab. Those assertions still require their
own atomic editorial decisions. Their evidence pages also enter the Sources tab
when a rights decision is needed. Re-amending, rejecting or returning a promoted
row for evidence removes its generated assertions and any decisions attached to
the old versions; a source decision is cleared when its last promoted row is
removed. Candidate imports cannot update the public snapshot or publish.

## After assertions are complete

When every assertion has a decision, the workspace points to Sources next.
Resolve or exclude all unresolved sources, including licence treatment and
independence. Once assertions and source rights are complete, download the
review package. That package is the input to a separate reviewed data pull
request; downloading it does not publish.

## Data boundaries

| Information | Stored in D1 | Returned by normal workspace API | Included in review export | Published |
| --- | --- | --- | --- | --- |
| Assertion decisions | Yes | Yes | Yes | No |
| Source-rights decisions | Yes | Yes | Yes | No |
| Assertion/source audit history | Yes | No | Yes | No |
| Immutable bulk candidate rows | Yes | Bulk tab only | Yes | No |
| Bulk decisions and amendments | Yes | Bulk tab only | Yes | No |
| Promoted candidate assertions | Yes | Assertions and Bulk tabs | Yes | No |
| Organisation-catalogue decisions and amendments | Yes | Organisations tab | Yes | No |
| Public-safe inclusion catalogue | Repository-generated file | Organisations tab context | No | Listed with review status |
| Contribution content | Yes | Yes | No | No |
| Contribution contact email | Separate table | No | No | No |
| Plaintext receipt token | Never | Never | Never | No |
| Public registry records | Repository/release | Read-only context | No | Only after pull-request release |

All review pages and APIs use `no-store`. The page is marked `noindex,
nofollow`. Write APIs accept small same-origin JSON requests only.

## Review package

**Download review package** creates
`aesm-review-package-batch-001.json`. The workspace fetches the package in-page
and then starts the browser download, so the private session is retained. It
contains:

- schema and batch identifiers;
- assertion and source decisions;
- bulk import summaries, immutable candidate rows and row decisions for
  organisations, products, deployments, aliases, corporate relationships and
  organisation-to-software links;
- organisation-catalogue decisions and amendments;
- live canonical organisation IDs and profile URLs created by Accept or Amend;
- promoted candidate assertions;
- the assertion, source and bulk-promotion audit trail;
- the generating reviewer and timestamp; and
- explicit flags showing that the package itself does not authorise an
  immutable versioned release.

The package status also records how many organisation decisions are live in the
canonical registry and how many bulk candidates are approved, held for
evidence or rejected. The release planner lists held and rejected candidate rows
explicitly but does not treat a deliberately held row as part of the approved
release scope.

It excludes contribution content, contact details, receipt tokens, and public
registry changes. The package is a handoff and audit artefact, not a release
file.

## Promotion to versioned repository data

Organisation-catalogue Accept and Amend decisions are already visible in the
live canonical registry. The steps below snapshot those decisions, plus the
separately reviewed assertion and bulk work, into immutable GitHub data.

After review:

1. export the review package;
2. run `scripts/prepare_review_release.py` to produce a checked keep, amend,
   remove, add-assertion, add-source and source-rights plan;
3. resolve any missing decisions, evidence needs or source-rights conflicts;
4. run `scripts/materialize_review_release_shard.py` once per planned shard to
   translate the ready plan into public, canonical delta tables;
5. preserve source IDs and assertion-level provenance;
6. run repository, schema, privacy, and snapshot checks;
7. open a pull request that links the review batch;
8. obtain independent human review; and
9. merge and run the documented release process.

The planning script exits with a blocker status until the review is complete and
always writes `publicationAuthorised: false`. No API in `/review` publishes or
merges an immutable GitHub release.

The materializer converts temporary `cand_*` identifiers to permanent public
IDs, retains assertion-level source locators, removes private reviewer identity
and internal research notes, and refuses output above 25 entities or 100
assertions. Each shard remains unpublished until it receives independent review
and is composed into a versioned release.

## Storage and migration

The workspace, bulk queue and operations controls use nine D1 tables:

- `assertion_reviews`;
- `source_reviews`;
- `review_audit_events`;
- `system_settings`;
- `maintenance_runs`;
- `bulk_imports`; and
- `bulk_import_rows`;
- `bulk_row_reviews`; and
- `promoted_assertions`.

The review tables are created by `web/drizzle/0001_fancy_senator_kelly.sql`;
the operations tables are created by
`web/drizzle/0002_aspiring_whistler.sql`; the bulk-intake tables are created by
`web/drizzle/0003_deep_magneto.sql`; and candidate review and assertion
promotion are created by `web/drizzle/0004_curious_magma.sql`. All numbered migrations must be
applied in order on a new database. The application uses the same `DB` binding
as contribution intake while maintaining table and query boundaries between
public data, moderation data, and private contact data.

## Operator checks

Before deployment:

1. apply pending D1 migrations;
2. set `REVIEWER_EMAILS` to the exact comma-separated admin email allowlist;
3. run `npm run lint` and `npm test` in `web/`;
4. confirm a signed-out request is redirected;
5. confirm a signed-in but unlisted account is denied;
6. confirm an allowlisted reviewer can save and export a test decision;
7. confirm the latest maintenance run is visible in Operations;
8. confirm pause and resume both require a reason and are audited;
9. confirm a test candidate can move through More evidence, Accept, Reject and
   Amend, with promoted assertions appearing and disappearing accordingly;
10. confirm the public downloads are unchanged by those decisions; and
11. clear the test decision if it was made in production.

The daily retention pass and intake freeze control are documented in
[Automation and review assist](23-automation-and-review-assist.md). Before a
public beta, complete encrypted D1 backups and restore testing, external
monitoring, and the privacy-incident exercise described in
[Contribution intake and moderation](21-contribution-intake-and-moderation.md).
