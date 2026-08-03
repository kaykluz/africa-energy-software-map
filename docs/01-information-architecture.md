# Information architecture

## Navigation

Phase 1 navigation is intentionally small:

**Stack · Deployments · Directory · Software wall · Methodology**

Global search and Contribute remain available across all views. Data downloads
live in the Directory. Organisation and country pages are reached contextually.

### Software wall

Answers: **What software and enabling infrastructure appears across the wider
landscape?**

The wall arranges catalogue identities across the six value-chain stages and a
cross-cutting band. Selecting a tile opens the listing detail in place. Wall,
list, deployment leads, history, sources and exports share the same catalogue
route. Broad inclusion does not create a reviewed deployment claim.

## Reviewed database, three views

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
/deployments
/directory
/landscape
/methodology
/products/{slug}
/organisations/{slug}
/countries/{iso2}
/contribute
/data
```

`/` is the canonical Stack route. `/stack` permanently redirects to `/`.

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

The implementation-level design contracts are:

- [Phase 1 UI/UX design system](14-phase-1-ui-ux-design-system.md)
- [Phase 1 page specifications](15-phase-1-page-specifications.md)
