# Contribution intake and moderation

## Status

Phase 1 has durable intake for four public routes:

- submit a product;
- add deployment evidence;
- correct a record; and
- claim an organisation profile.

The website stores completed submissions in its hosted database. A browser draft
is only a temporary convenience and is never the authoritative copy. Intake does
not write to the public registry, generated snapshot, downloads, or GitHub data
files.

The private `/review` workspace now provides allowlisted maintainers with the
first editor console. It supports triage, recorded reasons, audited private
contact access, and assertion/source review. It intentionally cannot publish;
an accepted proposal still becomes public only through a reviewed repository
change and release. See [Review workspace](22-review-workspace.md).

## Contributor experience

1. The contributor chooses one of the four routes.
2. The form reveals only the fields needed for that route.
3. The contributor supplies a direct public source.
4. Deployment contributors confirm that no sensitive infrastructure data is
   included.
5. The server validates, rate-limits, and stores the submission.
6. The contributor receives a receipt ID and a private status link.

The status link contains a high-entropy secret. Only its SHA-256 hash is stored.
The link is excluded from search indexing, responses use `no-store`, and tokens
must not appear in analytics, support tickets, screenshots, or public issues.
Losing the link does not expose the contribution; it only removes self-service
status access.

## Storage boundaries

| Data | Store | Public? | Retention |
| --- | --- | --- | --- |
| Temporary non-sensitive draft | Contributor browser | No | Until submitted or cleared by the browser |
| Contribution content and workflow state | Hosted D1 `contributions` table | No | Until the moderation and audit policy permits deletion |
| Contact email | Separate D1 `contribution_contacts` table | No | 150 days live; no more than 180 days including recovery history |
| Receipt secret | Contributor’s URL only | No | Never stored in plaintext |
| Receipt-token hash | D1 `contributions` table | No | With the contribution |
| Abuse counter | D1 `contribution_rate_limits` table | No | Rolling operational window |
| Accepted registry facts | Repository data and release pipeline | Yes, after review | Versioned release history |

Contact email is deliberately excluded from browser drafts, public exports,
receipt responses, and the main contribution row. Expired contact rows are
purged during successful intake and receipt activity. The scheduled daily
maintenance endpoint also purges them when the site has no traffic and records
the deletion count without copying contact data into the run log.

The live deletion date is 150 days. Managed D1 point-in-time recovery may retain
a deleted database state for up to 30 more days, keeping total potential
recoverability within the stated 180-day maximum. A restore drill must confirm
this boundary before public launch.

## Validation and abuse controls

The server, rather than the browser, is authoritative. It:

- accepts JSON only and caps request bodies at 20 KB;
- requires a same-origin browser request;
- permits only the four documented submission types;
- checks required fields by route;
- accepts only taxonomy categories and African country codes;
- accepts only direct HTTP or HTTPS source URLs;
- limits lengths and normalises strings before storage;
- rejects exact coordinate patterns, credentials, tokens, passwords, and
  private keys in publishable text;
- uses a hidden honeypot for simple bots; and
- limits a browser/network signature to five stored contributions per UTC day.

The rate-limit key is a one-way hash of the day, connecting IP, and user agent.
Raw IP addresses are not stored by the application. Necessary hosting security
logs remain governed by the hosting provider’s retention controls.

These controls reduce routine abuse; they do not replace editorial review.
Editors must treat source URLs and all contributor text as untrusted.

## Moderation states

```text
received → triaged → researching → needs_evidence → reviewed
         → accepted → published
         → rejected
         → duplicate
         → withdrawn
```

`accepted` means the proposal may be included in a future data release.
`published` may only be set after the corresponding repository change has passed
the evidence, rights, privacy, and human-review gates. A provider-confirmed
statement remains provider-confirmed; acceptance never upgrades evidence
independence.

Every status change now records the editor, time, reason, before state, and
after state. Linking an accepted item to its eventual pull request remains
required before a public beta.

## Maintainer procedure

For each received item:

1. Check for spam, duplicates, sensitive material, and unsafe links.
2. Confirm the contributor relationship and keep private contact details out of
   public discussion.
3. Open and classify the supplied source.
4. Break the proposal into atomic assertions.
5. Research an independent source where the supplied source is provider-authored
   or otherwise insufficient.
6. Create a normal repository data change with provenance and review dates.
7. Obtain human review through a pull request.
8. Publish through the snapshot and release gate.
9. Update the receipt state only after the matching workflow event.

Rejected submissions are not silently erased when they form part of the
moderation audit, but unnecessary personal data must still be removed on
schedule.

## Failure and recovery

- If D1 is unavailable, the API fails closed and does not issue a successful
  receipt.
- The form retains its non-sensitive local draft after a failed submission so
  the contributor can retry.
- A successful response is returned only after a rate-limit slot has been
  reserved and the contribution has been committed.
- Database backups and a tested restore procedure are required before public
  beta. Public registry snapshots remain independently reproducible from Git.
- During abuse or a privacy incident, stop intake, preserve relevant audit
  records, rotate exposed credentials or links, remove sensitive content, and
  follow the repository incident-response procedure.

The private Operations tab provides the stop-intake control, current retention
status, and open-queue health. Scheduled maintenance and secret handling are
defined in [Automation and review assist](23-automation-and-review-assist.md).

## AI boundary

No AI model evaluates, verifies, accepts, or publishes the submitted record.
Future automation may deduplicate, classify, suggest missing fields, or open a
research task. Its output must remain a labelled proposal, with the original
submission preserved and a human controlling every state or public-data change.
