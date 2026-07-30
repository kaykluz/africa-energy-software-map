# Interaction and accessibility specification

This document records the foundational decisions. The implementation-level
contracts are the [Phase 1 UI/UX design system](14-phase-1-ui-ux-design-system.md)
and [page specifications](15-phase-1-page-specifications.md).

## Visual direction

The public product is light-first: warm neutral background, quiet surfaces,
strong typography, cobalt actions, teal deployment scale, and colour used
sparingly for category-level market conditions.

Evidence uses neutral wording rather than colour. Lifecycle uses outline tags.
Origin, evidence, lifecycle, freshness, and market conditions never share a
visual encoding.

## Filters and URLs

Primary filters:

- country;
- energy segment;
- category;
- evidence; and
- more filters.

Active filters, result count, and Clear all remain visible. Every state is
shareable by URL and persists across Stack, Deployments, and Directory.

## Preview behaviour

- Product cards and directory rows open the same preview component.
- Country selection opens a country panel first.
- Product selection transitions to product preview with a visible breadcrumb.
- Back returns to the country or prior stack position with filters preserved.
- Escape closes overlays.
- Mobile preview is a full-screen route.

## Accessible release criteria

Target WCAG 2.2 AA. The application must provide:

- complete keyboard navigation;
- visible, unobscured focus;
- semantic controls and headings;
- sufficiently sized pointer targets;
- non-colour status labels;
- reduced-motion behaviour;
- reflow without clipped data;
- screen-reader descriptions for map and grid states;
- no hover-only information; and
- Directory/table equivalents for mapped results.

## Responsive behaviour

- Mobile defaults to directory cards.
- Stack stages become accordions.
- Filters open in a sheet while active filters remain visible.
- Deployments lead with a ranked country list; country grid follows.
- Country panels become bottom sheets.
- Wide tables reduce to essential columns with row drill-down.

## Performance

Browsing requires no account. Initial pages are server-rendered and useful
without heavy client scripting. Dataset payloads are compressed and interactions
progressively enhance the core pages.
