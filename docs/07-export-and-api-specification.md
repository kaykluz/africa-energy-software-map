# Export and API specification

## Principle

The public application is a view of the dataset. Users must be able to reuse the
underlying records without scraping the website.

## Phase 1 exports

- Filtered CSV from the Directory
- Normalised CSV package
- JSON and JSONL
- Country/province-level GeoJSON
- Excel-compatible workbook
- Versioned release archive
- Changelog and data dictionary

The inclusive `/landscape` CSV and JSON exports keep energy relationship,
granular function, value-chain stage, sector and Africa-use fields separate. A
broad listing never inherits a reviewed deployment verdict through export.

## Release package

```text
organisations.csv
products.csv
capabilities.csv
product-capabilities.csv
deployments.csv
deployment-parties.csv
sources.csv
assertions.csv
changes.csv
datapackage.json
README.md
CHANGELOG.md
LICENSE
checksums.txt
```

## Versioning

- Dataset releases use semantic versions.
- Schema-breaking changes increment the major version.
- Added fields increment the minor version.
- Corrections without schema changes increment the patch version.
- Records use stable IDs across releases.
- Deleted or merged IDs resolve to replacement or retirement metadata.

## API direction

The future read API will provide:

```text
GET /v1/products
GET /v1/products/{id}
GET /v1/organisations/{id}
GET /v1/deployments
GET /v1/countries/{iso2}
GET /v1/taxonomy
GET /v1/releases
```

Filters mirror the public views and use documented pagination, sorting, and
stable response schemas. API access is read-only in Phase 1; changes use the
moderated contribution workflow.

## Metadata

Release metadata should describe publisher, licence, temporal and geographic
coverage, update frequency, version, distributions, checksums, and API access.
DCAT-compatible metadata and a Data Package manifest are desirable without
requiring the internal database to use RDF.

## Geography

GeoJSON exports exclude non-public precise infrastructure coordinates. Location
precision and disclosure status travel with every deployment.
