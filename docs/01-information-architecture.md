# Information architecture

## Navigation

Phase 1 navigation is intentionally small:

**Stack · Deployments · Directory · Methodology**

Global search and Contribute remain available across all views. Data downloads
live in the Directory. Organisation and country pages are reached contextually.

## One database, three views

### Stack

Answers: **What exists at each layer of the energy system?**

The stack uses six value-chain stages plus a cross-cutting band. Categories are
full-width horizontal bands. Each collapsed product tile contains:

- product name;
- organisation;
- origin classification; and
- count-based evidence summary.

Selecting a product opens a preview. Opening the profile is a second action.

### Deployments

Answers: **Where is the product evidenced as being used?**

Geographic modes:

- evidenced deployments;
- claimed availability;
- headquarters; and
- founded in.

A geographic choropleth is the recognisable desktop view. An equal-area country
grid preserves small states and serves as the analytical/mobile alternative.
Country or province is the default maximum precision.

### Directory

Answers: **Show me the structured records.**

The Directory supports filtering, sorting, column selection, permalinks, and
export of the current result set.

## Core routes

```text
/
/stack
/deployments
/directory
/methodology
/products/{slug}
/organisations/{slug}
/countries/{iso2}
/contribute
/data
```

Every public entity page is server-rendered, crawlable, and assigned a stable
canonical URL.

## Persistent state

- Switching views preserves filters.
- Filter state is encoded in the URL.
- Browser Back restores the prior selection, scroll position, and filters.
- Selecting country → deployment → product preserves the country context.
- Search automatically opens collapsed stages containing matches.

## Progressive disclosure

```text
all stages → selected stage → category → product preview → full profile
country overview → deployment → product preview → full profile
directory row → product preview → full profile
```

## Search

Search covers products, organisations, countries, and capabilities. It supports
sector synonyms such as PAYG/pay-as-you-go, C&I/commercial and industrial, and
AMI/advanced metering.

People are not a primary Phase 1 entity or search promise.

