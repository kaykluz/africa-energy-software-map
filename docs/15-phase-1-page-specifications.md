# Phase 1 page specifications

Every page must implement purpose, anatomy, actions, responsive behaviour,
loading/empty/error/stale states, accessibility, analytics, and acceptance
criteria below.

## 1. Stack homepage

**Route:** `/`  
**Job:** “Show me what software exists at this part of the energy system.”

### Anatomy

1. Header
2. H1 `The software powering African energy`
3. Definition and public data version/freshness
4. Large search
5. Filter bar and result count
6. Six stage sections
7. Cross-cutting band
8. Compact market-condition legend
9. Recently verified strip only when real changes exist
10. Coverage statement and contribution prompt
11. Footer

Desktop opens the first relevant stage. Search/filters may open multiple matching
stages. A collapsed stage shows category and matching-product counts. An expanded
category shows four to six product tiles; View all expands in place and updates
URL without moving focus.

Category states: published, research queue, not researched, no verified entry,
structurally thin. Only the last uses the structural marker and linked analysis.

Mobile uses stage/category accordions and product rows; product selection goes to
full profile.

**Acceptance:** find a relevant product within three interactions; no evidence/
market-condition confusion; no clipping at 320px/200% zoom; filters persist
across views.

## 2. Deployments

**Route:** `/deployments`  
**Job:** “What software and organisations have a recorded relationship to this country, and what kind of relationship is it?”

### Anatomy

Header/H1, an object switch (Software or Organisations), contextual filters,
software-location or organisation-presence mode, representation mode (Map, Country grid, Ranked
list), legend, dominant visual/list, selected country panel, methodology note.

Software filters are search, country, stage, category, evidence, origin,
lifecycle and access. Canonical organisation filters are search, actor group,
specific role, broad sector, energy market and origin. Catalogue coverage uses
search, role, energy market, headquarters and review scope because catalogue
classifications are not silently upgraded to canonical taxonomy.

Every filter constrains the map, equal-area grid, ranked list, totals and country
panel from the same result set. The current object, presence layer, filters,
focused country and representation are encoded in the URL. The country panel
and Filtered directory action preserve compatible filters when opening Data or
Organisations; changing representation never clears them.

Software defaults to all recorded locations: reviewed deployments, itemised
catalogue locations and the publisher's African headquarters. These are
independently selectable and labelled; a catalogue location or headquarters is
never presented as deployment evidence. Raw catalogue records merge with a
canonical product only when an explicit canonical link exists.

Organisations default to a de-duplicated union of all recorded presence. The
separate layers are catalogue activity, evidenced activity, company-stated
activity, software-linked activity, offices or legal entities, product
availability, headquarters and origin. A warehouse or facility is shown only
after that relationship is explicitly recorded; it is not inferred from an
office or headquarters.

Desktop defaults to all software locations + map. Alternative representations are
explicit, shareable URL state on every viewport.

Country panel: country, count for the selected layer, records with compact
location-type labels, browse action and country page. Canonical products retain
preview; catalogue-only records open in the catalogue. Back restores country,
filters, layer, representation and position.

Solid teal represents evidenced count; hatching claimed; light neutral researched
zero; patterned neutral unknown; cobalt outline selection.

Map failure leaves list/grid available. Small states must be findable by search
and keyboard.

## 3. Directory

**Route:** `/directory`  
**Job:** “Show me the data and let me narrow or export it.”

H1, filters, result count/version, Sort/Columns/Page size/Export toolbar, table or
mobile cards, pagination, licence note.

Default columns: Product, Organisation, Category, Countries, Access model,
Evidence, Last checked. Server pagination 25/50/100. Query sort defaults to
relevance; otherwise product name. Applying a filter returns to page 1.

Column selector groups identity, classification, geography, commercial, and
evidence. Product cannot be hidden.

Export-current-view dialog states record count, filters, columns, format
CSV/JSON, include sources, licence/attribution. Full releases route to `/data`.

Mobile cards show product, organisation, category, evidence line, countries, and
last checked.

**Acceptance:** state reproduces after refresh; export matches the stated view;
table works without hover or colour.

## 4. Search

**Overlay and route:** `/search?q=`  
**Job:** Find an entity/capability without knowing the taxonomy.

Overlay groups Products, Organisations, Countries, Capabilities; full results
page has All and entity sections. Shared filters appear only when meaningful.

Zero state: no published match, spelling/synonym suggestions, related categories,
Clear filters, Submit product, incompleteness statement. Never show unreviewed
candidates.

Search works as a server page without JavaScript. Free-text query is excluded
from analytics.

## 5. Product profile

**Route:** `/products/{slug}`  
**Job:** “What does it do, where is it deployed, and what proves those claims?”

### Header

Breadcrumb, product, organisation, description, category, origin, lifecycle,
provider-profile confirmation separately, last checked, correction action.

### Sections

1. At a glance — model, platform, customers, segments, access/open source,
   launch year where sourced
2. Capabilities
3. African deployments
4. Claimed availability, separate
5. Integrations/standards
6. Owning organisation
7. Assertion-level evidence and sources
8. Rename/acquisition/correction history
9. Add deployment, correct, claim

Deployment rows show country, customer disclosure, year, lifecycle, evidence,
source. Confidential says Customer undisclosed and gives publishable verification
basis. Provider claims never enter evidenced totals.

Old slugs redirect to the preserved history/successor.

## 6. Organisation profile

**Route:** `/organisations/{slug}`

Header: name, type, origin, country of origin, current headquarters, lifecycle,
website, provider-profile confirmation, last checked, correct/claim.

Sections: overview, products, evidenced African presence, claimed presence
separately, deployments grouped by product, optional privacy-safe public team
information, organisation history, sources/changes.

Do not infer customer/funder/implementation roles from ownership. No separate
public people pages in Phase 1.

## 7. Country profile

**Route:** `/countries/{iso2}`

Phase 1 is an evidence-led software index, not a complete market/regulation page.

Header: country, evidenced deployments, additional claims, products, categories,
last country review, View in Deployments/Directory.

Sections: category distribution, evidenced deployments by category/product,
claimed availability collapsed, Africa-built/founded association separately,
research coverage/source families, sources/changes, suggest missing deployment.

Totals reconcile with filters. Country links preserve country state in other
views. `Customer undisclosed` does not leak identity.

## 8. Methodology

**Route:** `/methodology`

In-page contents:

1. Scope
2. Exclusions
3. Entity/taxonomy
4. Deployment definition
5. Evidence
6. Sources/independence
7. Origin
8. Lifecycle/freshness
9. Market condition
10. AI use/human review
11. Contribution/dispute
12. Sensitive infrastructure
13. Licence/exports
14. Methodology history

Include one worked example separating provider availability, evidenced
deployment, customer confirmation, and outcome. Show methodology version,
effective date, GitHub diff, and prior versions.

## 9. Contribute hub

**Route:** `/contribute`

Four clear choices: Submit product, Add deployment, Correct record, Claim
profile. Each explains evidence required, steps, and editorial review. Quiet link
for suggesting a source.

## 10. Submit product

**Route:** `/contribute/product`

Steps: product/owner; purpose/category; optional deployment evidence; sources;
relationship/permission; review. Run duplicate matching before submit and offer
correction/deployment alternatives. Warn that availability is not deployment.

## 11. Add deployment

**Route:** `/contribute/deployment`

Steps: select product; country/safe geography; named/undisclosed/unknown customer;
live/pilot/historical and year; evidence/source relationship; sensitive-data
confirmation; review. Exact coordinates prohibited.

## 12. Correct record

**Route:** `/contribute/correction`

Prefill entity, assertion, and current value. Collect proposed value,
explanation, evidence, relationship. Requests to erase sourced history enter
dispute review.

## 13. Claim profile

**Route:** `/contribute/claim`

Select entity; organisation-domain email; role/authority; domain verification;
review current profile; propose field updates with sources. Claiming grants no
direct editing and does not independently verify deployments.

All forms have named progress, local non-sensitive draft, Back preservation,
review screen, error summary/inline errors, submission ID, and no “Published”
success wording.

## 14. Data and downloads

**Route:** `/data`

Current release, coverage/quality notice, CSV/JSON/GeoJSON/workbook, filtered
export link, schema/dictionary, API status, licence/attribution, prior releases,
report issue. Every file lists version, date, size, checksum availability, and
tables.

## 15. Data release

**Route:** `/data/releases/{version}`

Immutable version/date, files/checksums, schema, record counts, coverage, changes,
limitations, licence/citation, generated time, Git commit/tag. Old assets are
never replaced.

## 16. Public changes

**Route:** `/changes`

Filterable additions, corrections, renames, merges, retirements, evidence
changes, disputes, methodology/taxonomy. Each shows entity, fields, date,
human/AI-assisted editor type, reason, and public PR/source. Personal contributor
details private unless attribution opted in.

## 17. Accessibility statement

**Route:** `/accessibility`

WCAG 2.2 AA target, alternatives, known issues, tested combinations, review date,
feedback route, response process. Do not claim conformance before evidence.

## 18. Privacy

**Route:** `/privacy`

Browsing analytics, form data, claim verification, public attribution, retention,
processors, transfers, rights/contact, security limitations, effective date. No
cookie banner when no nonessential cookies exist.

## 19. Licence

**Route:** `/licence`

MIT code; intended CC BY 4.0 project data/docs; third-party exclusions; copyable
attribution; logos/source rights; API/export use; restrictions; takedown route.

## System states

- **404:** search, Stack, Directory, broken-link report; redirect merged IDs.
- **500:** retry and safe navigation; preserve form drafts; no internals.
- **Loading:** server content first; restrained delayed skeleton; one announcement.
- **No results:** state whether filters, research, evidence, or structural reason.
- **Stale:** date and correction action; do not imply inactive.
- **Historical:** history strip and successor; excluded from default active totals.
- **Disputed:** Under review, date, neutral explanation.
- **Confidential:** publishable aggregation only; no identity clues in coordinates,
  filenames, excerpts, or analytics.
- **Offline/client failure:** server content continues; forms do not claim success
  without confirmation.

## Usability acceptance plan

Prototype with varied real-shaped content: African/global/open source, provider
claim, independently evidenced, renamed, confidential, island-country, stale,
research queue, and structurally thin.

Critical tasks:

1. Find evidenced mini-grid billing in Nigeria.
2. Explain provider claim versus customer confirmation.
3. Switch deployment/headquarters without losing filters.
4. Open sources behind a structural finding.
5. Return product preview to selected country.
6. Export current filtered data.
7. Correct a deployment year.
8. Submit confidential-customer deployment.
9. Find a small island country without pointer.
10. distinguish stale from historical.

Run two rounds of 5–7 participants and a private beta around 15 users. Release
threshold: ≥80% unassisted completion of the first seven tasks, no systematic
origin/lifecycle/evidence confusion, all keyboard tasks complete, no blocker at
320px/200% zoom, and clear unknown-versus-zero comprehension.
