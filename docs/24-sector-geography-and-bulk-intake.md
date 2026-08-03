# Sector, geography and bulk intake

Status: scale-up implementation contract
Last updated: 3 August 2026

## Inclusion is based on African use, not headquarters

An organisation does not need an African headquarters to appear in the map.
The registry includes a product when it is Africa-built, public infrastructure
used for African energy work, or has a sourced product deployment in an African
country.

These facts remain separate:

| Fact | Meaning |
| --- | --- |
| Country of origin | Where the organisation or product was originally built |
| Headquarters country | Current corporate headquarters, including outside Africa |
| Origin classification | Relationship between the provider and the African market |
| Deployment country | African country where actual use is sourced |
| Availability claim | A market claim that is not a deployment |

The organisation profile may show a global headquarters and an African
deployment footprint together. The default map continues to count deployments,
not offices, reseller coverage or marketing availability. A future headquarters
layer must be visually and numerically separate.

The four origin classifications remain:

- `africa_built`;
- `africa_founded_global_hq`;
- `global_deployed_in_africa`; and
- `public_or_open_infrastructure`.

## E-mobility

E-mobility is already a Phase 1 category:
`cat_emobility_battery_networks`.

Include software that operates or coordinates energy-facing mobility systems,
including:

- charge-point and charging-network management;
- battery swapping and battery-network operations;
- charging payments, roaming and settlement;
- energy-aware fleet charging;
- vehicle-to-grid or grid-interactive charging; and
- charging-site energy and storage optimisation.

Exclude generic vehicle marketplaces, logistics applications, navigation,
hardware-only chargers and ordinary fleet tracking unless the product performs
an energy-system function.

Deployment evidence must still identify actual use in an African country.
“Available in Africa” and a distributor relationship remain provider claims.

## Two complementary navigation lenses

The electricity value chain answers **what the software does**. The sector lens
answers **where it is used**. They should not replace or duplicate one another.

Phase 1 keeps the value chain as the primary Explore path. The scale-up model
adds six sectors:

1. Power networks and utilities
2. Distributed energy and energy access
3. Generation and storage
4. Commercial and industrial energy
5. E-mobility and battery networks
6. Markets, finance and carbon

A product has one primary value-chain category and may belong to several
sectors. Sector relationships are many-to-many. The bulk intake captures sector
IDs now; the public sector switch is a Phase 1.1 interface addition and should
not block the first reviewed release.

## Bulk intake

The standard workbook is available at:

`/downloads/templates/africa-energy-software-map-bulk-import.xlsx`

Only the `Bulk Records` sheet is imported. It uses one row per atomic record
and supports six record types:

1. organisation;
2. product;
3. deployment;
4. organisation alias;
5. organisation-to-organisation relationship; and
6. organisation-to-software relationship.

Organisation rows keep the canonical identity separate from many-to-many roles,
energy sectors and market segments. Pipe-separated controlled IDs are promoted
to individual, source-linked relationship records. Alias rows preserve former,
trading, acronym, local-language and spelling-variant names without replacing
the canonical name. Corporate relationships require stable IDs at both ends and
can record parent, subsidiary, affiliate, acquisition, merger, brand, division,
joint-venture and management links with optional validity dates. Software links
separately record ownership, development, internal operation, use,
implementation, integration or resale.

The browser reads the workbook locally and sends structured rows to the private
review API. The raw file is not stored. The server:

1. revalidates every field;
2. rejects formulas and altered headers while ignoring non-import sheets;
3. separates canonical entities from classifications, aliases and relationships;
4. rejects precise or confidential infrastructure content;
5. prevents provider sources from claiming independent confirmation;
6. plans batches within 25 entities and 100 generated assertions using the same
   field-level count as promotion;
7. stores immutable candidate rows and an audit event;
8. records row decisions and amendments separately;
9. normalises approved public source URLs;
10. converts accepted or amended rows into atomic review assertions; and
11. exposes no publish action.

Bulk intake is an acceleration path into editorial review, not an alternative
to it. Source support is confirmed by a human, every promoted assertion receives
its own decision, unknown source rights are resolved in the Sources queue, and
release still requires a human-reviewed data pull request.

Candidate organisation rows may leave origin, primary role or sector blank when
the source does not establish them. Intake records a visible warning instead of
inventing a classification. Public release remains stricter: a newly
materialised organisation requires reviewed origin, a reviewed primary role and
at least one reviewed sector. `unknown` is used only where it is a supported
controlled value, never as a substitute for missing evidence.

The release planner repeats those limits against the assertions actually
approved. If an older import used a lower estimate, it creates new release
shards without changing or repeating the completed editorial decisions.
The shard materializer then writes canonical entities and their optional
organisation relationship tables alongside factual metadata, resolved sources
and reviewed assertions in `data/release-shards/`; the private review package
and reviewer contact data never enter GitHub.

## Scale-up automation layers

| Layer | Automated | Human gate |
| --- | --- | --- |
| Intake | Workbook parsing, field checks, batching | Submit or upload |
| Matching | Duplicate and existing-ID suggestions | Confirm identity |
| Evidence | Source relationship and missing-locator flags | Decide claim status |
| Research | Approved-source monitoring and candidate extraction | Approve source and candidate |
| Freshness | Review-due and broken-link queues | Amend, supersede or retain |
| Release | Reproducibility, privacy, schema and checksum checks | Approve and merge |

No layer may verify its own research, write to the default branch, merge, or
publish.
