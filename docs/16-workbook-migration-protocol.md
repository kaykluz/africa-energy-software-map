# Workbook migration protocol

## Purpose

This protocol converts a research workbook into reviewable candidate data. It
does not confer publication or verification status.

## Controls

1. The source workbook stays outside the public repository.
2. The import records its filename and SHA-256 checksum.
3. Only explicitly eligible sheets are read.
4. People and submitter-contact sheets are always rejected.
5. Workbook IDs map to permanent canonical IDs through a legacy-ID table.
6. Countries use ISO 3166-1 alpha-2.
7. Multi-country marketing coverage never becomes a country deployment.
8. Evidence is classified from source authorship, not workbook wording.
9. Provider-authored deployment claims remain `provider_claim_only`.
10. Every emitted field assertion links to a normalised source record.
11. Heuristic or lossy transformations produce review warnings.
12. Candidate batches remain below 25 entities and 100 assertions.
13. Workbook outcomes and scale claims are not imported until they can be
    represented as separately sourced assertions with measurement context.

## Data flow

```text
external workbook
  → whitelisted sheet parser
  → privacy and sensitive-field rejection
  → legacy-ID, country, taxonomy, lifecycle and evidence mapping
  → canonical candidate tables
  → atomic assertions and normalised sources
  → review-sized batches
  → repository validation
  → human editorial review
  → later immutable release
```

## Evidence downgrade

Terms such as “verified” in a source workbook describe the prior research
process. They are not imported as project verification. The importer evaluates
the source domain:

- official DFI/programme sources may support `independently_evidenced`;
- customer or utility sources may support `customer_confirmed` deployment
  assertions;
- provider sources support `provider_claim_only`; and
- unknown source families require editorial review.

Source titles, publication dates, locators, publishers, rights, and automation
permissions must be completed during review. A provisional retrieval date
copied from a workbook `Last_Verified` field is explicitly flagged.

## Geography

The importer accepts a country only when it maps unambiguously to one ISO2 code.
Composite or multi-country values are withheld from deployment geography and
reported for editorial resolution. Safe descriptive subnational areas may be
retained as candidates, but named plants, control centres, and other sensitive
contexts are flagged for safety review. Exact coordinates are never emitted.

## Privacy

Publicly available names are still personal data. The People sheet is excluded
because Phase 1 does not publish public people profiles. Submission contact
fields are excluded because private intake data must not be committed to public
Git.

## Review outcome

An accepted batch may be promoted into a versioned release only after a human
has:

- opened the sources and inspected relevant passages;
- completed source titles, dates, locators, and rights metadata;
- confirmed entity resolution and taxonomy;
- assessed infrastructure and confidentiality risk;
- verified the asserted field values; and
- recorded the reviewer and review date.
