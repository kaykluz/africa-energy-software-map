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

The release indicator remains **Held**. There is intentionally no publish
button.

Five tabs divide the work:

| Tab | Use |
| --- | --- |
| Assertions | Review one atomic candidate claim against its linked source |
| Sources | Record rights, licence treatment, and source independence |
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
| Contribution content | Yes | Yes | No | No |
| Contribution contact email | Separate table | No | No | No |
| Plaintext receipt token | Never | Never | Never | No |
| Public registry records | Repository/release | Read-only context | No | Only after pull-request release |

All review pages and APIs use `no-store`. The page is marked `noindex,
nofollow`. Write APIs accept small same-origin JSON requests only.

## Review package

**Download review package** creates
`batch-001-human-review-package.json`. It contains:

- schema and batch identifiers;
- assertion and source decisions;
- bulk import summaries, immutable candidate rows and row decisions;
- promoted candidate assertions;
- the assertion, source and bulk-promotion audit trail;
- the generating reviewer and timestamp; and
- explicit `containsPublicDataChanges: false` and
  `publicationAuthorised: false` flags.

It excludes contribution content, contact details, receipt tokens, and public
registry changes. The package is a handoff and audit artefact, not a release
file.

## Promotion to public data

After review:

1. export the review package;
2. run `scripts/prepare_review_release.py` to produce a checked keep, amend,
   remove, add-assertion, add-source and source-rights plan;
3. resolve any missing decisions, evidence needs or source-rights conflicts;
4. translate the ready plan into the canonical repository tables;
5. preserve source IDs and assertion-level provenance;
6. run repository, schema, privacy, and snapshot checks;
7. open a pull request that links the review batch;
8. obtain independent human review; and
9. merge and run the documented release process.

The planning script exits with a blocker status until the review is complete and
always writes `publicationAuthorised: false`. No API in `/review` edits the
canonical tables or publishes a release.

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
