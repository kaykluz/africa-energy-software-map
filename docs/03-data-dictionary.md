# Data dictionary

Machine-readable table fields are defined in
[`schemas/tables.json`](../schemas/tables.json). This document explains their
meaning.

## Shared conventions

- IDs are permanent lowercase strings with entity prefixes.
- Dates use ISO 8601.
- Countries use ISO 3166-1 alpha-2.
- URLs include their scheme.
- Empty means unknown only when the field definition permits it.
- Multi-valued relationships use join tables rather than delimited cells.

## Organisation

Key fields include name, slug, organisation type, origin classification, country
of origin, headquarters country, lifecycle status, website, description, and
last-checked date.

Origin classifications:

- `africa_built`
- `africa_founded_global_hq`
- `global_deployed_in_africa`
- `public_or_open_infrastructure`

An organisation may have an origin and headquarters outside Africa. It remains
eligible when a product has a sourced African deployment. Headquarters, origin,
availability and deployment geography are never substituted for one another.

## Product

Key fields include organisation ID, name, description, primary category,
lifecycle status, access model, repository URL where applicable, product
website, launch year, and last-checked date.

Product and organisation records remain separate even when an organisation owns
only one product.

Sector IDs form a separate many-to-many classification. They describe the
markets in which a product is relevant; they do not replace the primary
value-chain category or imply an evidenced deployment.

## Deployment

A deployment records the use or claimed use of a specific product in an African
market. It includes country, optional safe subnational geography, disclosed or
undisclosed customer, lifecycle, year, location precision, and last-checked
date.

Availability, sales territory, partner presence, and product marketing do not
constitute a deployment.

## Source

Every source records title, publisher, type, date, retrieval date, URL, archive
URL where permitted, licence, and independence class.

Independence classes:

- `customer_or_official`
- `independent_primary`
- `independent_secondary`
- `provider_authored`
- `aggregator`
- `community_submission`

## Assertion

An assertion contains:

- a subject type and ID;
- a predicate;
- a value;
- a supporting source;
- evidence status;
- human or AI extractor;
- reviewer and review date;
- validity dates; and
- notes or uncertainty.

Examples include product ownership, deployment customer, deployment year,
capability, or market-condition reasoning.

## Change

Change records preserve old value, new value, actor, time, and editorial reason.
Renames, mergers, corrections, and superseded claims are never silently
overwritten.
