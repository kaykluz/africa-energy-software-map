# Changelog

## Unreleased

- Applied the organisation actor/market model across profiles, methodology,
  contribution intake and review labels; removed obsolete five-record prototype
  wording from public release pages; and added a dedicated sourced organisation
  submission route.
- Added a consistent product identity cascade across profiles, the stack,
  directory, map, search and preview surfaces: approved product mark first,
  approved owning-organisation mark second, then a typographic fallback.
- Replaced the organisation process-chain treatment with eight parallel actor
  groups: financiers, developers and owners, OEMs and suppliers, EPCs and
  installers, operators and service providers, software and data, enablers and
  advisers, and public institutions. Energy markets such as mini-grids, C&I,
  SHS/PAYGo, utility scale, storage and e-mobility remain a separate filter, with
  specific roles, broad sectors and evidenced countries available as additional
  dimensions. Optional relationship tables support future organisation imports
  without duplicating canonical records or inventing classifications.
- Made the 540-listing catalogue the default Explore surface, promoted Wall to
  a primary view, added a first-class Organisations atlas, replaced the map
  grid default with clickable Natural Earth country geometry and introduced a
  locally stored, source-registered first batch of organisation marks.
- Composed reviewed release `0.2.0` from the independently approved `0.1.0`
  baseline and all 13 bounded Batch 001 shards: 64 organisations, 94 products,
  20 country-level deployments, 75 rights-resolved sources and 1,276 reviewed
  assertions. Eleven candidates remain held for stronger evidence.
- Added a deterministic, checksum-verifying release composer that rejects
  missing shards, conflicting IDs and private-review boundary failures.
- Patched the production dependency graph, disabled unused runtime image
  optimisation, added global response hardening and made high-severity
  production audit findings fail continuous integration.
- Clarified the Git-backed public registry and D1-backed private workflow
  boundary, added a visible admin sign-out, domain-ready canonical metadata and
  a production backend, admin and custom-domain runbook.
- Shortened live contact retention to 150 days so managed database recovery
  history cannot extend potential retention beyond 180 days.
- Prepared reviewed data release `0.1.0` from Batch 001: 61 assertion
  acceptances, 27 amendments, five resolved source-rights decisions, 88
  reviewer-attributed assertions and deterministic public downloads.
- Added a privacy-preserving promotion command that records the private review
  package digest and a public reviewer label without committing reviewer
  contact data or granting automated publication authority.
- Switched the generated interface snapshot from candidate mode to the reviewed
  Batch 001 release.
- Added a visually validated bulk-intake workbook and private candidate import
  queue with automatic review-size batching.
- Added six sector lenses while keeping the electricity value chain as the
  primary Phase 1 navigation.
- Clarified inclusion of global-headquartered providers with sourced African
  deployments and the e-mobility scope boundary.
- Added a post-assertion next-step prompt for source-rights review.

All notable project, schema, taxonomy, policy, and data-release changes will be
documented here.

- Created the repository foundation.
- Added product, data, evidence, editorial, export, and autonomous-agent
  specifications.
- Added initial schemas, empty data templates, contribution forms, and
  validation checks.
- Added the privacy-filtered workbook migration pipeline, aggregate audit,
  first review-sized candidate batch, UI data bundle, and stricter validation.
- Added a reproducible Batch 001 evidence-review overlay with nine completed
  source records, source-linked corrections and explicit human-review blockers.
- Added a deterministic candidate snapshot and download pipeline, explicit
  editorial promotion gate, 54-country reference, generated UI data adapter,
  public candidate downloads, and reproducibility checks.
- Added durable, moderated contribution intake with separate private contact
  storage, private receipt links, abuse and sensitive-data controls, a complete
  taxonomy/country vocabulary, and an operating and retention contract.
- Added an authenticated `/review` workspace for candidate assertions, source
  rights, and contribution triage, with optimistic version checks, append-only
  audits, logged private-contact reveal, decision export, D1 migrations, and no
  path to automatic publication.
- Added scheduled retention and queue-health automation, an audited intake
  pause control, deterministic source-first review preparation, a safe
  policy-readiness agent run, a bounded Batch 002 plan, and synthetic beta-scale
  checks. All automation remains proposal-only.
