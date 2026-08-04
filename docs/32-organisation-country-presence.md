# Organisation country presence

Status: implemented data contract and interface support; public records still require human review.

Organisation geography answers several different questions. The map stores them
separately so a headquarters address, a company market list and an independently
documented project cannot become the same claim.

## Public record

`organisation-presences.csv` contains one stable record for one organisation,
country and presence type:

- `operations` — the organisation says or is evidenced to operate in the country;
- `project_participation` — a sourced role in a named or safely described project;
- `office` — a sourced office location at country precision;
- `warehouse` — a sourced warehouse, depot or distribution facility at country precision;
- `legal_entity` — a sourced registered entity or local subsidiary;
- `product_deployment` — the organisation's non-software product is deployed;
- `product_availability` — the organisation offers a product in the market.

Lifecycle is `active`, `planned`, `historical` or `unknown`. Origin and current
headquarters remain organisation fields. Reviewed software deployments remain
their own records and are exposed as a derived “software deployed” layer.

Every presence record needs assertion-level evidence. The snapshot derives its
display evidence and source from the reviewed assertions attached to the
presence record.

## Company websites

An official company website is a valid direct source for what the company says
about itself. It is recorded as `provider_authored` and normally displayed as
`provider_claim_only`. It can support a company-stated operating market, office,
legal entity, product availability or announced project role.

It cannot independently confirm a deployment, customer outcome or third-party
relationship. A later customer, official or independent source may add or
supersede evidence without deleting the provider-authored history.

## Interface layers

Organisation profiles, the organisation directory, country profiles and the map
share the same layers:

- evidenced activity;
- company-stated presence;
- offices, warehouses and legal entities;
- product availability;
- reviewed software deployments;
- headquarters;
- country of origin.

Filters and exports preserve the selected layer. Organisation CSV exports use
separate columns rather than one ambiguous list of “countries active”.

### Africa-wide coverage

`Africa-wide` is a catalogue coverage scope, not a country presence assertion.
It remains visible and filterable as regional scope, but it never places an
organisation in every African country. Country maps and country pages require a
named, sourced country through activity, an office, warehouse, entity, project,
deployment, availability or headquarters. An Africa-wide record can therefore
appear in a country only when that separate country-level basis also exists.

The interface does not expand `Africa-wide`, `West Africa`, `East Africa`,
`Sub-Saharan Africa` or any other regional label into countries. Profiles and
exports retain the original scope so the display rule is auditable.

## Review intake

Use `record_type=organisation_presence` in the bulk workbook with:

- `existing_organisation_id`;
- `organisation_presence_country_iso2`;
- `organisation_presence_type`;
- `organisation_presence_lifecycle_status`;
- the normal source, independence, evidence, locator and rights fields;
- optional `valid_from` and `valid_to` when directly sourced.

Upload rows remain candidates. Acceptance creates atomic assertions, and a
reviewed release shard materialises the presence table. No company list or
spreadsheet “countries active” cell is published without this review step.
