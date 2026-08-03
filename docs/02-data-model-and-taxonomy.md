# Data model and taxonomy

## Core model

```text
Organisation → Product → Capability
      ├──────→ Role → Ecosystem actor group
      ├──────→ Sector / Segment
      ├──────→ Software relationship → Product
                    ↓
                Deployment → Party
                    ↓
                 Assertion → Source
```

Each object has a stable ID. Assertions connect individual claims to sources and
reviews. Names, classifications, and lifecycle states may change without
changing identity.

## Core entities

| Entity | Purpose |
| --- | --- |
| Organisation | Provider, customer, partner, utility, programme, or other party |
| Organisation role | Sourced role with one primary display role and optional secondary roles |
| Organisation sector | Broad energy-sector relationship, independent of role |
| Organisation segment | Granular market segment, independent of role and geography |
| Organisation software relationship | Owns, develops, operates, uses, implements, integrates or resells a product |
| Product | A named software product, platform, protocol, or public system |
| Capability | A reusable function or secondary tag |
| Product capability | Many-to-many product classification |
| Deployment | An evidenced or claimed use in an African market |
| Deployment party | Organisation role within a deployment |
| Source | A document, webpage, record, repository, or confirmation |
| Assertion | An atomic sourced claim about an entity |
| Submission | A proposed addition, correction, claim, or evidence item |
| Change | Published revision history |

## Value-chain taxonomy

| Stage | Categories |
| --- | --- |
| Plan and design | Planning and geospatial; Engineering, design and simulation |
| Finance and procure | Finance, procurement and underwriting |
| Generate and store | Generation and storage operations |
| Transmit and distribute | Transmission and system operation; Distribution utility operations; Forecasting, flexibility and DER orchestration |
| Meter and serve | PAYGo and mini-grid operations; Retail metering, billing and payments; C&I and behind-the-meter; E-mobility and battery networks |
| Trade and report | Trading, wheeling and settlement; Carbon, MRV and reporting |
| Cross-cutting | Data, interoperability and security |

Products receive one primary category and any number of secondary capabilities.

Organisations use a separate actor taxonomy: Financiers; Developers and owners;
OEMs and suppliers; EPCs and installers; Operators and service providers;
Software and data; Enablers and advisers; and Public institutions. These are
parallel market-participant types, not stages in a chain. Actor groups are
derived from reviewed organisation roles and must never be substituted for the
software value-chain stages above.

The three dimensions answer different questions:

- **Actor type** — who the organisation is in the market;
- **Energy market** — where it works, such as mini-grids, C&I, SHS/PAYGo,
  utility scale, storage or e-mobility; and
- **Software value chain** — what a software product does.

They remain independently filterable. For example, an EPC may work in both C&I
and mini-grids, while one software platform may support developers, operators
and financiers across several markets.

The inclusive landscape adds a granular function layer and one primary energy
relationship. These answer different questions from the reviewed category:

- **Function** describes the specific work, such as payment infrastructure,
  utility vending, AMI, CIS and billing, or IoT connectivity.
- **Energy relationship** distinguishes Built for energy, Applied in energy,
  Enabling infrastructure, Operator-owned, Public and research, and To
  classify.

Relationship is not a quality, evidence or inclusion verdict. See
[Classification and software wall](28-classification-and-software-wall.md).

## Sector lens

The value chain describes what a product does. Sectors describe where it is
used. A product may belong to several sectors:

- Power networks and utilities
- Distributed energy and energy access
- Generation and storage
- Commercial and industrial energy
- E-mobility and battery networks
- Markets, finance and carbon

Sector membership does not change the product’s primary value-chain category
and does not establish a deployment. The controlled IDs are in
[`data/taxonomy.json`](../data/taxonomy.json). See
[Sector, geography and bulk intake](24-sector-geography-and-bulk-intake.md).

## Separate concept systems

The following must not be collapsed into one status:

- **Origin** — where and by whom a product was built.
- **Lifecycle** — active, pilot, historical, acquired, merged, inactive, or under
  review.
- **Evidence** — provider claim, public source, independent evidence, or customer
  confirmation.
- **Freshness** — current, review due, stale, or historical.
- **Market condition** — category-level analysis, never a vendor rating.
- **Energy relationship** — how a landscape listing relates to energy, never a
  vendor rating.
- **Organisation role** — what a market actor does, independent of product
  function, sector, geography and evidence strength.

## Unknown-state discipline

`unknown`, `not_found`, `not_applicable`, `confidential`, and `not_researched`
are distinct values. Absence of evidence is not evidence of absence.

The canonical taxonomy is in [`data/taxonomy.json`](../data/taxonomy.json).
