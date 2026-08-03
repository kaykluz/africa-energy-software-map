# Classification and software wall

## The classification problem

The catalogue includes software that plays very different roles. Paystack,
AWS IoT Core and Odoo can be important to an energy business without being
energy products. A utility customer app can be software used in energy while
remaining an internal service rather than a product sold to the market. Public
models and research datasets form another distinct group.

Keeping all of these names is useful. Presenting them as though they are the
same kind of energy software is not.

## Five separate questions

Each listing is described on independent axes:

| Axis | Question | Example for Paystack |
| --- | --- | --- |
| Energy relationship | What is its relationship to energy? | Enabling infrastructure |
| Function | What work does it do? | Payment infrastructure |
| Value-chain stage | Where is it used? | Meter and serve |
| Sector | Who in energy uses it? | Utilities or distributed energy, when supplied |
| Africa link | What African use or availability was supplied? | Kept separately from classification |

No axis is a score, endorsement, evidence verdict or exclusion rule.

## Energy relationship

The primary relationship has six values:

| Value | Use when |
| --- | --- |
| Built for energy | Energy is the product's primary domain. |
| Applied in energy | A broader product has a distinct energy or utility use. |
| Enabling infrastructure | A horizontal payment, cloud, connectivity or enterprise service is used by energy organisations. |
| Operator-owned | A utility, energy company, market operator or programme runs the software for its own service. |
| Public and research | The listing is public-interest, open, academic or research infrastructure. |
| To classify | The listing stays visible while the relationship is resolved. |

This is deliberately independent of headquarters, ownership, commercial model,
open-source status, lifecycle and evidence strength.

## Function layer

The original broad categories remain available for compatibility with the
reviewed registry. The landscape adds a more granular function layer. Important
splits include:

- metering and AMI;
- utility CIS and billing;
- utility vending and collections;
- horizontal payment infrastructure;
- customer apps and engagement;
- IoT and connectivity platforms;
- energy interoperability and standards;
- grid and OT cybersecurity;
- enterprise business systems; and
- public energy data and reporting.

The canonical values and their stage relationships live in
[`data/taxonomy.json`](../data/taxonomy.json). Every landscape listing has a
corresponding row in
[`data/landscape/classifications.json`](../data/landscape/classifications.json).

## Editorial rules

Classification follows these rules:

1. Classify the product's primary proposition, not the identity of one known
   customer.
2. Record a general-purpose platform as enabling infrastructure even when its
   energy use is material.
3. Use Applied in energy when a wider platform has a distinct utility or energy
   product line.
4. Use Operator-owned for internal systems, utility apps and market-operator
   platforms that are not separately offered products.
5. Keep public and research infrastructure separate from commercial products.
6. Use To classify instead of guessing.
7. Do not infer deployment evidence, lifecycle or quality from classification.

Rules are reproducible in `scripts/import_phase1_landscape.py`. Changes to a
rule must update the tests and regenerate the overlay.

## Software wall

The landscape opens on separate relationship lanes before arranging products
across the six value-chain stages. This prevents a horizontal platform from
being presented as though it were energy software. The visible hierarchy is:

1. **Core energy software** — products built for the energy system.
2. **Software applied to energy** — split into energy-focused versions and
   horizontal infrastructure. Paystack belongs in the horizontal
   infrastructure subsection.
3. **Operator and public systems** — split into operator-owned and public or
   research tools.
4. **To classify** — visible, but kept outside the settled lanes.

Each lane has its own value-chain wall and cross-cutting band. Core and applied
software are open by default. The supporting and review lanes use progressive
disclosure, but open automatically when a search or filter returns matches.
The wall is a navigation surface, not a ranking:

- every tile has equal visual weight;
- the default order is alphabetical;
- relationship and function can be filtered;
- selecting a tile opens the full catalogue detail without losing the wall;
- each stage links to a list filtered by both stage and relationship; and
- source directories stay in the list and export views rather than the software
  wall.

The wall uses a product mark when an approved standalone product logo exists.
Otherwise it inherits the owning organisation's approved mark; when neither is
available it uses a restrained typographic identity. Logos are optional
classification metadata and must be stored locally. They are never hotlinked.
Each accepted logo needs an official source URL recorded beside it. Logo
presence does not affect ordering or prominence.

The first approved local asset batch is registered in
[`data/brand-assets/organisations.json`](../data/brand-assets/organisations.json).
Standalone product assets use the parallel
[`data/brand-assets/products.json`](../data/brand-assets/products.json) register.
It records both the official page on which the mark was found and the exact
asset URL. The same local file is reused on the wall, organisation atlas and
related product and organisation profiles. Checksums make silent asset changes
detectable. A missing, blocked, ambiguous or visually unsuitable mark remains a
typographic tile; completeness is not a reason to use an unverified image.

The main public views are **Explore**, **Map**, **Data** and **Wall**. Explore
defaults to the complete 540-listing inclusion catalogue. Data remains the
reviewed-record view. This is a scope distinction, not a quality score, and the
interface links directly between the two.

## Scale-up

The overlay allows future sectors, stages and functions to be added without
rewriting source-shaped catalogue records. At larger scale the same wall can be
served from a paginated endpoint, while the repository overlay remains the
versioned source for editorial classification.
