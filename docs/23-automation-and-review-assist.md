# Automation and review assist

## Purpose

This automation layer removes repetitive preparation and operations work without
delegating evidence decisions or publication to software. It runs four bounded
workstreams:

1. retention and moderation operations;
2. deterministic review preparation;
3. proposal-only research readiness; and
4. Batch 002 and launch-scale preparation.

Every generated artefact declares that it cannot authorise publication.

After a reviewer exports Batch 001, `scripts/prepare_review_release.py` checks
the package against the exact registry snapshot. It detects missing or unknown
decisions, unresolved source rights, accepted assertions tied to excluded
sources, incomplete safety checks and evidence holds. A complete package becomes
a deterministic keep/amend/remove plan for a human-reviewed data pull request;
it never edits canonical tables or authorises publication.

The scale-up layer also supports validated bulk workbooks, automatic review-size
batch planning, sector capture, duplicate fingerprints and candidate-only
storage. See
[Sector, geography and bulk intake](24-sector-geography-and-bulk-intake.md).

## Responsibility boundary

| Activity | Automation | Human |
| --- | --- | --- |
| Remove expired contact email | Runs daily | Investigate failures |
| Clear expired abuse counters | Runs daily | Investigate anomalies |
| Pause or resume contribution intake | Enforces the setting | Supplies the reason and activates it |
| Group assertions by source | Generates the queue | Opens the source and decides |
| Identify rights, provider and safety signals | Generates visible preparation | Confirms what the evidence supports |
| Plan Batch 002 | Selects the next bounded batch | Approves research and review |
| External source research | Disabled | Approves sources and a runtime first |
| Accept, verify, publish or merge | Prohibited | Required |

## Daily operations

The private operations service:

- deletes contact rows whose 150-day live retention date has passed, keeping
  maximum recoverability within 180 days when the D1 recovery window is included;
- deletes rate-limit windows older than three days;
- retains 90 days of maintenance-run history;
- counts the open moderation queue;
- records the oldest open submission;
- writes an operations audit event; and
- exposes a protected health response without contribution content or contact
  details.

The GitHub `Safe automation` workflow calls the maintenance endpoint every day.
It records only deletion counts and queue counts in the workflow summary.

Three encrypted GitHub secrets are required:

- `AEM_SITE_URL`;
- `AEM_OPERATIONS_TOKEN`; and
- `AEM_SITES_BYPASS_TOKEN`.

The same `OPERATIONS_TOKEN` value is stored as a secret runtime variable in
Sites. The Sites bypass token gets the scheduled request through the site’s
owner-only sign-in gate; it does not grant reviewer access or bypass the
operations bearer-token check.

If any secret is absent, the workflow exits without changing data. Failed HTTP
requests fail the workflow and become an operational alert in GitHub.

## Intake control

The **Operations** tab in `/review` shows:

- whether contribution intake is active;
- the latest maintenance run;
- expired-contact count;
- open queue size; and
- the oldest open submission date.

An allowlisted reviewer may pause or resume new contributions after supplying a
reason. Every change is version-checked and audited. Existing receipt pages and
stored contributions remain available while intake is paused.

This is the incident kill switch. It does not delete records or alter the public
registry.

## Review preparation

`scripts/build_review_assist.py` creates the deterministic
`web/generated/review-assist.json` file from the candidate registry snapshot.
It:

- groups all 88 assertions under their nine sources;
- places the five unresolved-rights sources first;
- identifies provider-authored and provider-claim records;
- flags missing locators and sensitive-data terms;
- recommends either source inspection or an evidence request; and
- sets `automationCanDecide: false` for every assertion.

The interface displays these signals as compact preparation tags and groups the
queue by source. It never preselects Accept, Amend or Reject.

The repository validator rebuilds this file and fails when the committed output
differs, omits an assertion, permits an automated decision or authorises
publication.

## Research runner

The repository policy runner is enabled in `policy_readiness` mode. A weekly
GitHub job:

1. validates repository and automation contracts;
2. confirms the review preparation is reproducible;
3. reads the approved source register;
4. emits a dry-run report;
5. runs the 500-product and 2,000-deployment scale check; and
6. stores the reports as a private 30-day workflow artefact.

External network research remains disabled. The current source register has no
active automation-approved sources, so the runner fetches nothing and creates no
candidates. This is intentional.

OpenClaw, Hermes or another runtime may later implement the adapter contract,
but activation requires:

- named, automation-approved source-register rows;
- a reviewed runtime credential;
- model and cost limits;
- prompt-injection and sensitive-data tests;
- a successful candidate-only dry run; and
- an editor responsible for the resulting queue.

The adapter may open research branches and pull requests. It may not write to
`main`, approve, merge or publish.

## Batch 002

`scripts/prepare_next_batch.py` reads the privacy-safe aggregate workbook audit
and selects the next bounded batch. The committed plan covers:

- five organisation candidates;
- 16 total entities; and
- 87 candidate assertions.

The plan permits privacy-filtered import, normalisation, entity matching,
duplicate detection, schema checks and review-bundle generation. It explicitly
prohibits verification and publication.

The workbook remains outside Git. Creating the actual Batch 002 data package is
a separate, data-only pull request after the tooling in this change is reviewed.

## Launch-scale check

`scripts/check_launch_readiness.py` builds an in-memory fixture of 500 products
and 2,000 deployments and exercises repeated country and search filters within
a fixed runtime budget. It does not publish or commit the synthetic fixture.

This is a regression guard, not a replacement for keyboard, screen-reader,
slow-device and moderated user testing.

## Backup limitation

This change does not copy private contribution or reviewer data into GitHub
workflow artefacts. Automated database backup must use a platform-supported,
encrypted D1 backup destination with a tested restore procedure. Until that is
configured, the backup-and-restore item in the moderation-operations issue
remains open.

## Deployment checklist

1. Apply the new D1 migration.
2. Set the Sites `OPERATIONS_TOKEN` secret.
3. Configure the three GitHub Actions secrets.
4. Deploy the reviewed site version.
5. Manually run **Safe automation** once.
6. Confirm the Operations tab shows the completed run.
7. Test Pause and Resume with a non-production contribution.
8. Confirm the public registry and downloads are unchanged.
