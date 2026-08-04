# Information architecture

## Navigation

The public navigation is intentionally small:

**Database · Map · Method**

Global search and Improve the map remain available everywhere. Reviewed
software, downloads, changes, accessibility and administration sit in the
utility menu. Organisation, product and country pages are reached contextually.

## One database, several views

The Database is the single public discovery surface. It has two record types:

- **Software** — products, public tools and research leads.
- **Organisations** — financiers, developers, OEMs, EPCs, operators, software
  providers, enablers and public institutions.

The same records can be represented as Cards, Wall or Map. Wall applies only to
software. Switching representations preserves compatible filters. Review status
is a filter and label, not a separate directory.

### Software cards

Answers: **What software and digital tools are in the database?**

Cards are the default software view. Search and filters cover relationship to
energy, function, value-chain stage, sector, record type, Africa link and review
status. A card opens a preview or its stable record when one exists.

### Software wall

Answers: **How does the software landscape fit together?**

The Wall arranges the same filtered software identities across the six
value-chain stages and a cross-cutting band. It never ranks products. Selecting
a tile opens the same record or preview used by Cards.

### Organisation cards

Answers: **Who participates in African energy, and what do they do?**

The Organisation object uses one inclusion catalogue. It is filterable by actor
type, role, energy market, broad sector, country activity, headquarters and
review status. Accepted duplicates resolve to one reviewed profile while their
source-listed names and facts remain attached to that profile.

### Map

Answers: **Where are these records connected to Africa?**

Software and Organisations are switchable objects on the same map. Each
geographic layer retains its meaning:

- reviewed deployment;
- catalogue location;
- explicit Africa-wide coverage;
- headquarters;
- company-stated presence;
- office or local entity;
- product availability; and
- software-linked activity.

A catalogue location never silently becomes deployment evidence. Country or
province is the default maximum precision.

## Reviewed release table

`/directory` is the compact, sortable and exportable table of reviewed software.
It supports evidence inspection and release-oriented work without presenting
itself as a competing public catalogue.

## Core routes

```text
/
/organisations
/deployments
/landscape
/directory
/methodology
/products/{slug}
/organisations/{slug}
/countries/{iso2}
/contribute
/data
```

`/` is Software Cards, `/landscape` is Software Wall, `/organisations` is
Organisation Cards and `/deployments` is the shared Map. `/stack` permanently
redirects to `/`.

Every reviewed entity page is server-rendered, crawlable and assigned a stable
canonical URL. “Canonical” is an implementation and URL concept, not a competing
public record type.

## Persistent state

- Switching Cards, Wall and Map preserves compatible filters.
- Filter state is encoded in the URL.
- Selecting country, record or related entity preserves a clear return path.
- Search opens matching software, organisations, countries and capabilities.

## Progressive disclosure

```text
database → filtered cards or wall → preview → full record → sources
map → country → filtered country records → full record → sources
```

## Search

Search covers software, organisations, countries and capabilities. It supports
sector synonyms such as PAYG/pay-as-you-go, C&I/commercial and industrial, and
AMI/advanced metering.

People are not a primary Phase 1 entity or search promise.

The implementation-level design contracts are:

- [Phase 1 UI/UX design system](14-phase-1-ui-ux-design-system.md)
- [Phase 1 page specifications](15-phase-1-page-specifications.md)
- [Visual interaction redesign](17-visual-interaction-redesign.md)
