# Expansion architecture and roadmap

Status: Phase 1 implementation contract  
Last updated: 30 July 2026

## Decision

The current Explore, Map and Data structure can support the planned Phase 1
release and a substantially larger registry.

Growth must happen through bounded previews, stable filters, paginated records
and generated data snapshots. It must not add more text or more cards to the
initial screen.

Some possible future subjects are extensions of the current registry. Others
are separate products or datasets and require a later information-architecture
decision.

## Capacity targets

### Phase 1 editorial target

- approximately 100 products;
- 25 or more countries with reviewed coverage;
- 75–100 evidenced deployments;
- 12–18 categories;
- multiple evidence states on one product; and
- reviewed CSV, JSON, JSONL, GeoJSON and workbook releases.

### Engineering scale test

The public interface must also be tested with synthetic, non-published records
at:

- 500 products;
- 2,000 deployments;
- all 54 African countries;
- 50 organisations returned by one search;
- 25 categories; and
- 10 years of release metadata.

Synthetic records test display and performance only. They never enter the
research branch or public release.

## Stable public structure

| Public object | Current role | Growth rule |
| --- | --- | --- |
| Explore route | Value-chain orientation | Keep six stages and the cross-cutting band stable |
| Category card | Small product preview | Show four records by default, then link to Data |
| Product drawer | Fast comparison | Keep summary, evidence and direct profile actions |
| Map | Country-level evidence access | Keep equal-area grid and ranked alternative |
| Country panel | Country preview | Show five deployments, then link to Data |
| Data | Complete working set | Paginate, sort, select columns and export all matches |
| Search | Direct navigation | Search products, organisations, categories and countries |
| Product profile | Full product record | Add new sections progressively without enlarging previews |
| Organisation profile | Ownership context | Support multiple current and historical products |
| Country profile | National evidence context | Support categories, deployments and coverage notes |
| Method | Public rules | Version policies and disclose material changes |
| Downloads | Reproducible releases | Publish immutable packages and checksums |

The home routes remain orientation and navigation layers. They are not a
substitute for the full directory.

## Scale rules in the current interface

1. A category preview displays no more than four products without an active
   search. Search may display up to six before linking to Data.
2. A country preview displays no more than five deployment rows.
3. Data displays 25 rows by default, with 50 and 100-row options.
4. Pagination works on the complete filtered and sorted set.
5. Exports contain every filtered match, not only the visible page.
6. Search terms and filters persist between Explore, Map and Data in the URL.
7. Origin, lifecycle, access, evidence, category and country remain separate
   filter dimensions.
8. Zero, unknown, not assessed and confidential remain distinct states.
9. A provider claim never increases an evidenced deployment count.
10. New records do not increase the amount of permanent explanatory copy.

## Data boundary

The user interface reads a reviewed public snapshot. It does not read a
research queue, an agent candidate file or a provider submission directly.

```mermaid
flowchart LR
  A["Submitted or discovered lead"] --> B["Candidate assertions"]
  B --> C["Automated validation"]
  C --> D["Research pull request"]
  D --> E["Human editorial review"]
  E --> F["Reviewed normalised tables"]
  F --> G["Versioned public snapshot"]
  G --> H["Website, downloads and read API"]
```

The prototype now generates its snapshot and downloads from one selected,
checksum-verified normalised batch. `web/lib/registry-data.ts` is a display
adapter rather than a second record store. While the selected batch is still
under review, the release mode and interface remain explicitly `candidate`.
The generator refuses a `published` build until the assertion and source review
gate passes. See the
[snapshot and export pipeline](19-snapshot-and-export-pipeline.md).

The snapshot includes:

- release metadata;
- organisations;
- products;
- capabilities and categories;
- deployments;
- sources;
- assertion-level evidence;
- countries; and
- value-chain stages.

The user interface may later receive this snapshot from a database-backed read
API. Component behaviour and public URLs should not change when that happens.

## Future scope fit

### Fits the current model

These additions extend existing record types:

- more countries, organisations, products and deployments;
- additional capability tags;
- open-source repository links and access models;
- product lifecycle history;
- acquisition, merger and retirement records;
- named, undisclosed, unknown and confidential customers;
- provider claims kept beside independent evidence;
- market-condition findings with dedicated sources;
- source freshness and review status;
- integrations and interoperability statements;
- release comparison; and
- public aggregate charts derived from reviewed records.

They can appear through existing profiles, filters, the Data route and release
files.

### Requires a small extension

These additions need a new linked table or profile section but not a new main
navigation model:

- standards and protocol records;
- product-to-product integrations;
- procurement availability;
- funding or ownership events;
- source-health history;
- archived product names and redirects; and
- structured outcome assertions.

Each requires its own identifier, source linkage, evidence rule and export
field. The change should be added first to the data dictionary and schema, then
to the public snapshot.

### Requires a Phase 2 information-architecture decision

These subjects must not be forced into a product or deployment record:

- physical generation or network assets;
- precise infrastructure coordinates;
- a comprehensive project or transaction database;
- regulation and tariff tracking;
- market forecasts;
- public profiles of individual people;
- vulnerabilities or operational security data; and
- private collaboration workspaces.

They may share country identifiers and sources with the software registry, but
they need separate scope, safety and navigation decisions.

## Map evolution

The map remains prominent as the geographic entry point.

Phase 1 uses country-level disclosure because it is legible, comparable and
safer for infrastructure records. The equal-area grid avoids the visual bias of
large geographic countries, while the ranked alternative supports comparison
and keyboard use.

Future reviewed layers can include:

- evidenced deployments;
- provider-claimed markets;
- organisation headquarters;
- country of origin;
- category distribution;
- review freshness; and
- published aggregate outcomes.

Official geographic boundaries may be added as an alternative choropleth after
licensing, island treatment, accessibility and sensitive-location rules are
complete. Exact sites remain excluded unless the location is already public,
material and safe to reproduce.

## Search and filtering evolution

Phase 1 filtering can remain in the browser at the planned launch size. A
database-backed read API becomes appropriate when:

- the public product set exceeds approximately 500 records;
- filtered response size affects first load;
- searches require ranking, aliases or typo tolerance;
- deployment queries join many evidence records; or
- multiple published releases must remain browsable.

The API must preserve the public query vocabulary:

- `q`;
- `category`;
- `country`;
- `evidence`;
- `origin`;
- `lifecycle`;
- `access`;
- `sort`;
- `page`; and
- `page_size`.

Stable query parameters make views linkable, reproducible and usable in
academic citations.

## Contribution growth

Contribution remains visible in the header, hero action, empty states, country
panels and record correction routes.

As submissions increase:

1. forms produce candidate records, not published records;
2. duplicate detection runs before editorial review;
3. each submission receives a public-safe reference;
4. source URLs and claim wording remain attached;
5. confidential material is separated from the public repository;
6. editorial status is visible to the submitter where practical; and
7. corrections supersede records without erasing sourced history.

Provider submissions are useful leads. They do not become independent evidence
without a qualifying source.

## Automated research

An autonomous research process may:

- monitor approved source families;
- find candidate products and deployment claims;
- extract atomic fields;
- compare candidates with existing IDs;
- flag stale or conflicting assertions;
- validate formats and source availability; and
- open a bounded research pull request.

It may not:

- publish;
- merge its own pull request;
- mark its own output as evidence;
- infer missing customers, locations, dates or outcomes;
- expose confidential material; or
- convert product availability into a deployment.

The website consumes only a release produced after human editorial review.

## Delivery sequence

### A. Scalable interaction shell

- bounded category and country previews;
- directory pagination and page-size control;
- product, organisation, category and country search;
- origin, lifecycle and access filters;
- filter persistence between views;
- whole-result export; and
- responsive and keyboard behaviour.

### B. Reviewed snapshot generation

- migrate the workbook into normalised tables — implemented for the first
  review batch;
- resolve stable IDs and duplicate candidates — implemented for the first
  review batch;
- validate all foreign keys and accepted values — implemented;
- generate one candidate snapshot and download set — implemented;
- refuse publication until every assertion and source passes review —
  implemented;
- complete human evidence review and source metadata — outstanding;
- generate the first public snapshot from reviewed files — outstanding;
- generate release counts and checksums — implemented for candidate packages;
  and
- import the first approximately 100 reviewed products in small pull requests.

### C. Read service and geographic layer

- implement versioned read endpoints;
- move large-result filtering and pagination to the service;
- add caching and rate limits;
- add licensed country geometry;
- keep the equal-area and ranked alternatives; and
- publish API and field-change notes.

### D. Beta evaluation

- run moderated tasks with researchers, utilities and product providers;
- measure search success, route switching and evidence comprehension;
- test 500-product and 2,000-deployment fixtures;
- test slow connections and low-memory mobile devices;
- test screen-reader and keyboard paths; and
- revise labels or hierarchy before widening the scope.

## Release gates

Expansion is ready only when:

- no landing view becomes an unbounded record list;
- all new fields have a data-dictionary definition;
- all new claims can carry their own sources;
- public exports reproduce the filtered set;
- direct links preserve the selected view and filters;
- unknown and confidential values remain explicit;
- no source or submission bypasses review;
- performance targets pass at synthetic scale; and
- the scope and safety exclusions still hold.
