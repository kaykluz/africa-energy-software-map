# Organisation identity, relationships and intake

## Why identity comes before population

The Phase 2 inventory mixes legal organisations, brands, business units, funds,
facilities, former names and historical events. Treating every row as a company
would create duplicates and misleading ownership claims. The map therefore uses
one stable canonical organisation ID and source-linked records around it.

## Identity rules

- A rename does not create a new organisation ID. The old name becomes a dated
  alias and old URLs may redirect to the canonical profile.
- A subsidiary remains a separate organisation when it has a distinct operating
  identity worth navigating. Its parent link is a dated relationship.
- A brand or division may have a separate public profile only when the editorial
  review establishes a stable public identity. Otherwise it is an alias or label
  on the parent.
- An acquisition event does not automatically prove the acquired company remains
  an active subsidiary. `acquired_by` and `subsidiary_of` require separate claims
  when both are displayed.
- An affiliate is not assumed to be owned or controlled. Affiliate and membership
  links are explicitly non-ownership relationships.
- A joint venture links to each evidenced parent without flattening the venture
  into either parent.
- A fund, capital vehicle, programme or facility is not forced into an
  organisation row. It becomes a linked object with a `managed_by` relationship
  under the [capital, project and portfolio graph](31-capital-project-portfolio-graph.md).

## Directional relationship model

`organisation-relationships.csv` stores one direction: `organisation_id` to
`related_organisation_id`. The controlled relationship type supplies both the
forward and inverse public labels. This avoids duplicate inverse rows and makes
counts deterministic.

Supported relationship types cover subsidiary, affiliate, acquisition, joint
venture, spin-out, merger, manager, brand, division and membership relationships.
Each row has validity dates and a last-checked date. Assertions attach sources to
the relationship row, not merely to either organisation.

`organisation-aliases.csv` stores former names, trading names, acronyms,
local-language names and spelling variants. Aliases support search and identity
resolution but do not appear as duplicate directory records.

## Reconciliation order

The intake process uses the following order:

1. exact canonical name;
2. exact registered alias;
3. exact official website hostname;
4. exact catalogue name as a non-canonical lead; and
5. new or ambiguous candidate.

Fuzzy name matching may be shown to a reviewer later but never creates an
automatic identity link. Similar names, shared domains and group marketing pages
are common in this market and are unsafe deduplication signals on their own.

### Reviewed duplicate merge

`/review` provides a separate Duplicate decision. The reviewer searches the
published organisation registry by name or alias and selects the exact canonical
target. A merge requires the direct source to be opened and the identity,
classifications and publication safety to be confirmed. The selected canonical
ID is stored with the versioned decision; a note explains why the two names are
the same operating identity.

A duplicate decision never creates a second organisation or increases the
canonical directory count. The duplicate name and its aliases become search
aliases, its reviewed catalogue row remains visible on the canonical profile,
and its old deterministic candidate URL redirects to that profile. No fuzzy or
domain-only suggestion can perform this action automatically.

The canonical profile then presents the union of source-linked information from
all reconciled rows:

- every applicable actor role, ecosystem group, sector and market segment;
- documented countries, with catalogue coverage still distinguished from
  evidenced presence and software deployments;
- canonical and catalogue software, with catalogue-only items labelled as such;
- deployments in which the organisation is the software party or a named
  customer;
- project, deployment and relationship research leads, without promoting them
  into reviewed objects;
- related organisations that already have stable internal identities; and
- a complete external source ledger for the organisation, its software,
  deployments and relationship leads.

Equivalent source URLs are collapsed for display, but their contexts are joined
and the underlying source and assertion records are not deleted. Names link to
canonical internal records wherever an exact identity exists; otherwise the
direct external source remains available.

Rows with several named parties are marked `needs_split`. A reviewer separates
them into organisations, vehicles and relationships before promotion.

## Candidate boundary

The user-supplied inventory is a discovery lead, not evidence. Candidate batches:

- contain no more than 25 rows;
- preserve the submitted wording as unverified input;
- strip private conflict and ownership disclosures;
- suggest actor and market taxonomy IDs without publishing them;
- record exact matches and unresolved identities; and
- remain `needs_source_review` with publication disabled.

For each candidate, editorial promotion requires direct source links, source
independence and rights decisions, atomic assertions, and human review. Scale,
portfolio, customer and lifecycle claims are not promoted from the inventory
alone.

## Population order

1. Resolve exact matches and grouped rows so the same organisation cannot enter
   twice under different names.
2. Review corporate history cases because they exercise aliases and relationships.
3. Promote organisation batches by actor family, with no more than 25 entity
   changes or 100 assertions per pull request.
4. Add capital vehicles and programmes as linked objects after their own schema
   and review cadence are implemented.
5. Sourced organisation-presence records now have a shared schema, review path,
   Map layer, Directory filter, profile display and export contract. Population
   remains subject to normal human source review.

This intake model is reusable for later spreadsheets and community submissions;
new lists pass through the same identity index before they create review work.
