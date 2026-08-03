# Capital, project and portfolio graph

Status: Candidate model approved for staged implementation
Last updated: 3 August 2026

## Decision

Extend the map as a sourced market graph rather than placing capital, projects
and company claims in one organisation table. The durable public objects are:

```text
Organisation ── manages ── Capital vehicle ── finances ── Project
      │                                                │
      ├── party role ──────────────────────────────────┤
      ├── owns / develops / uses ── Product            ├── member of ── Portfolio
      └── parent / subsidiary / affiliate              ├── serves ───── Client
                                                       └── delivered at ─ Site
```

Every object and every relationship is independently sourceable, dated and
reviewable. A logo, shared name, directory membership or spreadsheet row never
creates a relationship by itself.

## Object boundaries

| Object | Meaning | Must not be flattened into |
| --- | --- | --- |
| Organisation | A navigable legal or operating identity | A fund, programme, project or brand alias |
| Capital vehicle | A named fund, facility, programme or financing vehicle | Its manager or sponsor |
| Project | A named energy asset, intervention or contracted programme | A provider's aggregate portfolio claim |
| Portfolio | An explicit grouping of projects, sites or clients | An inferred collection of similarly named projects |
| Client | The offtaker, customer or beneficiary organisation when publicly named | A free-text customer claim with unresolved identity |
| Site | A public project location at the safest useful precision | Precise non-public infrastructure coordinates |
| Transaction | A dated award, financing, investment, acquisition or close | The project or capital vehicle itself |
| Product | A software or technology product | Its owning organisation |
| Source | A publication or filing supporting an atomic assertion | A generic organisation homepage when a direct page exists |

A fund manager and its fund receive separate records. A project developer and
its project receive separate records. One organisation may manage several
vehicles, participate in several projects and have different roles on each.

## Relationship model

Project participation is stored as a typed edge, not embedded in prose. Initial
party roles are:

- developer, sponsor, owner and portfolio owner;
- client, offtaker and beneficiary;
- EPC, installer, system integrator, O&M provider and asset manager;
- OEM, equipment supplier and distributor;
- lender, equity investor, grant provider, guarantor, insurer and carbon buyer;
- adviser, programme partner, regulator and public enabler; and
- software developer, software provider, implementer, integrator and evidenced
  software user.

An organisation may hold several roles on the same project. Each role is a
separate assertion with a source, locator, evidence class, validity dates and
last-reviewed date. Public profiles show inverse navigation automatically: a
project links to its financier and the financier links back to the project.

Organisation identity relationships remain separate from project-party roles.
`subsidiary_of`, `affiliate_of`, `acquired_by`, `managed_by` and `brand_of` do
not imply shared projects, common ownership beyond the stated relationship or
current operating status.

## Capital and financial facts

Do not use one ambiguous `fund_size` field. Store a typed financial assertion:

| Field | Examples |
| --- | --- |
| Measure | target size, first close, final close, conditional commitment, committed capital, invested capital, transaction value |
| Amount | Original numeric value |
| Currency | ISO 4217 currency code |
| Status | announced, conditional, committed, closed, deployed, cancelled, unknown |
| As-of date | Date stated or supported by the source |
| Scope | Vehicle, portfolio, transaction or project ID |

Currency conversions are optional derived views and require an exchange-rate
source and date. The original amount and currency remain authoritative. Never
add a target, first close and final close together as if they were additive.

## Project and portfolio facts

Project status is controlled and time-aware: `announced`, `awarded`,
`contracted`, `financial_close`, `construction`, `operational`, `suspended`,
`cancelled`, `historical` or `unknown`. The interface labels these plainly; an
announced project is never counted as operational capacity.

Quantities are typed with a value, unit and scope. MW, MWp, MWh, sites,
connections and customers remain distinct. Reported pipeline, contracted
capacity, financed capacity and operating capacity are separate measures.

Portfolio membership is explicit. A source may support:

- a named project-to-portfolio edge;
- a disclosed aggregate count or capacity without named members; or
- a provider claim that remains visibly provider-authored.

An aggregate claim does not create fictional project rows. Named projects can
be added later without rewriting the historical aggregate assertion.

## Geography and safety

The map defaults to country-level project geography. Public city, province or
approximate site locations may be added only when the source publishes them and
the review finds no safety concern. Precise coordinates, vulnerabilities,
private client sites and confidential infrastructure data are prohibited.

The geographic interface supports object layers for organisations, projects,
portfolios and software deployments. Counts always state which object and which
status they include. Map selection opens a compact panel; stable names link to
their canonical profiles.

## Public experience

The first public layer should stay sparse and visual:

- `/capital` lists capital vehicles and managers, with typed size and status;
- `/projects` offers Map, Directory and Graph views;
- `/portfolios/{slug}` shows disclosed members and aggregate claims separately;
- organisation profiles show Capital, Projects, Products and Relationships only
  when reviewed edges exist; and
- project profiles show parties, technologies, software, financing events,
  sources and change history as collapsible layers.

Search resolves aliases but links only to canonical IDs. Graph views are an
alternate exploration surface, not the only way to access data; every edge is
also available in accessible lists and exports.

## Candidate and release workflow

1. Keep organisation-shaped rows, funds/programmes and possible identity
   duplicates in separate candidate queues.
2. Resolve exact canonical names, registered aliases and official domains before
   creating a new identity. Fuzzy matches are suggestions only.
3. Open the direct source and extract atomic object and edge assertions.
4. Record source independence, rights basis, locator and review date.
5. Review identity, object status, geography and financial measure separately.
6. Promote in pull requests below 25 entities and 100 assertions.
7. Materialise public profiles only when required identity and classification
   fields are complete.

The private intake may preserve a rejected or held row for audit, but private
employment, ownership, competitor or conflict disclosures must never be copied
into review notes, repository data, exports or the public database.

## Implementation sequence

1. Complete organisation identity review and sourced role/segment population.
2. Add capital-vehicle, project, portfolio and transaction candidate schemas.
3. Add review-workspace decisions for object identity and relationship edges.
4. Add materialisers and exports with the same source-per-assertion rule.
5. Introduce public Capital and Projects routes after the first reviewed data
   shards exist; empty navigation is not shipped.
6. Add visual graph and map layers after list, keyboard and export equivalents
   pass accessibility testing.

