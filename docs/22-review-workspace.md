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

The top strip answers four questions at a glance:

- how many assertions have a recorded decision;
- how many sources have a rights decision;
- how many contributions need attention; and
- whether the candidate batch is released.

The release indicator remains **Held**. There is intentionally no publish
button.

Three tabs divide the work:

| Tab | Use |
| --- | --- |
| Assertions | Review one atomic candidate claim against its linked source |
| Sources | Record rights, licence treatment, and source independence |
| Contributions | Triage private public submissions and inspect their supplied evidence |

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
event without copying the email into that event. The 180-day deletion date is
shown beside the email.

## Data boundaries

| Information | Stored in D1 | Returned by normal workspace API | Included in review export | Published |
| --- | --- | --- | --- | --- |
| Assertion decisions | Yes | Yes | Yes | No |
| Source-rights decisions | Yes | Yes | Yes | No |
| Assertion/source audit history | Yes | No | Yes | No |
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
- the assertion/source audit trail;
- the generating reviewer and timestamp; and
- explicit `containsPublicDataChanges: false` and
  `publicationAuthorised: false` flags.

It excludes contribution content, contact details, receipt tokens, and public
registry changes. The package is a handoff and audit artefact, not a release
file.

## Promotion to public data

After review:

1. export the review package;
2. translate accepted decisions into the canonical repository tables;
3. preserve source IDs and assertion-level provenance;
4. run repository, schema, privacy, and snapshot checks;
5. open a pull request that links the review batch;
6. obtain independent human review; and
7. merge and run the documented release process.

No API in `/review` performs steps 2–7.

## Storage and migration

The workspace uses three D1 tables:

- `assertion_reviews`;
- `source_reviews`; and
- `review_audit_events`.

They are created by `web/drizzle/0001_fancy_senator_kelly.sql`. Both numbered
migrations must be applied in order on a new database. The application uses the
same `DB` binding as contribution intake while maintaining table and query
boundaries between public data, moderation data, and private contact data.

## Operator checks

Before deployment:

1. apply pending D1 migrations;
2. set `REVIEWER_EMAILS`;
3. run `npm run lint` and `npm test` in `web/`;
4. confirm a signed-out request is redirected;
5. confirm a signed-in but unlisted account is denied;
6. confirm an allowlisted reviewer can save and export a test decision;
7. confirm the public downloads are unchanged by that decision; and
8. clear the test decision if it was made in production.

Before a public beta, complete the remaining operational controls in
[Contribution intake and moderation](21-contribution-intake-and-moderation.md):
scheduled contact purging, backups and restore testing, monitoring, an intake
freeze control, and a documented privacy-incident procedure.
