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
- offices and legal entities;
- product availability;
- reviewed software deployments;
- headquarters;
- country of origin.

Filters and exports preserve the selected layer. Organisation CSV exports use
separate columns rather than one ambiguous list of “countries active”.

### Africa-wide coverage

`Africa-wide` is a catalogue coverage scope, not an invented set of country
presence assertions. For discovery, an explicitly Africa-wide record appears in
every African country view and in the combined map. Every occurrence is labelled
`Africa-wide coverage`, can be isolated with its own filter and remains separate
from exact-country activity, offices, headquarters and deployments. Exact
country fields remain visible alongside the continental scope when both exist.

The interface does not expand regional labels such as `West Africa`, `East
Africa` or `Sub-Saharan Africa` into countries. Only an explicit all-Africa value
is projected continent-wide. Profiles and exports retain the original scope so
the display rule is auditable.

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
