# Data model and taxonomy

## Core model

```text
Organisation → Product → Capability
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

## Separate concept systems

The following must not be collapsed into one status:

- **Origin** — where and by whom a product was built.
- **Lifecycle** — active, pilot, historical, acquired, merged, inactive, or under
  review.
- **Evidence** — provider claim, public source, independent evidence, or customer
  confirmation.
- **Freshness** — current, review due, stale, or historical.
- **Market condition** — category-level analysis, never a vendor rating.

## Unknown-state discipline

`unknown`, `not_found`, `not_applicable`, `confidential`, and `not_researched`
are distinct values. Absence of evidence is not evidence of absence.

The canonical taxonomy is in [`data/taxonomy.json`](../data/taxonomy.json).

