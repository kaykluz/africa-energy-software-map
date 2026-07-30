# Phase 1 UI/UX design system

This is the implementation contract for the first public version of the Africa
Energy Software Map. It extends the approved wireframes into a responsive,
accessible, measurable product system.

## Direction

**Public registry meets editorial cartography.**

The product must feel authoritative, calm, legible, and inspectable. It is not a
marketing site, startup-logo landscape, or conventional pin map. Evidence,
freshness, and geographic honesty are part of the interface.

## Experience principles

1. **Evidence is interface.** Sources, evidence wording, and last-checked dates
   appear where claims appear.
2. **One dataset, three windows.** Stack, Deployments, and Directory preserve one
   filter state.
3. **Progressive disclosure.** Stage → category → product preview → full record
   → assertion sources.
4. **Density with calm.** Each screen has one dominant task; detail appears only
   when needed.
5. **Geographic honesty.** Deployment, claimed availability, headquarters, and
   founded-in are separate.
6. **Absence has states.** Not researched, research queue, no verified entry,
   and structurally thin are never conflated.
7. **No colour-only meaning.** Origin, evidence, lifecycle, freshness, and
   market condition use different labelled systems.
8. **Preserve context.** Back, refresh, and view switching preserve filters,
   selection, expansion, sort, page, and scroll.
9. **Public by default.** Browse, search, filter, inspect evidence, export, and
   correct without an account.
10. **Fast under constraint.** Server-rendered core content; maps and previews
    progressively enhance it.

## Canonical route map

| Route | Purpose |
| --- | --- |
| `/` | Canonical Stack homepage |
| `/deployments` | Deployment, claimed, headquarters, and founded-in geography |
| `/directory` | Structured filtering, sorting, and export |
| `/search?q=` | Shareable global results |
| `/products/{slug}` | Product record |
| `/organisations/{slug}` | Organisation record |
| `/countries/{iso2}` | Country record |
| `/methodology` | Scope, evidence, taxonomy, freshness, and AI disclosure |
| `/contribute` | Contribution hub |
| `/contribute/product` | Submit product |
| `/contribute/deployment` | Add deployment |
| `/contribute/correction` | Correct record |
| `/contribute/claim` | Claim profile |
| `/data` | Downloads and API direction |
| `/data/releases/{version}` | Immutable release |
| `/changes` | Public editorial changes |
| `/accessibility` | Accessibility statement |
| `/privacy` | Privacy notice |
| `/licence` | Licence and attribution |

`/stack` permanently redirects to `/`.

## Global shell

### Desktop header

64px high. Order: wordmark, Stack, Deployments, Directory, Methodology, flexible
space, Search, Contribute. Active route uses cobalt text and a 2px underline;
navigation is not a row of filled pills. Contribute is the sole outlined header
action.

The header becomes sticky only after the page title passes. Sticky UI must not
obscure keyboard focus.

### Mobile header

56px high: short wordmark, Search, Menu. The menu sheet contains primary
navigation plus Data, Changes, Accessibility, Privacy, and Licence. Escape/Back
closes and returns focus.

### Footer

Four groups:

- Explore — Stack, Deployments, Directory
- Project — Methodology, Changes, Roadmap, GitHub
- Contribute — Submit, Correct, Claim, Source
- Access — Data, Licence, Privacy, Accessibility

Show public data version and release date.

## Page title zone

Every page begins with optional breadcrumb, one H1, one-sentence description,
and compact metadata or primary action. Do not combine header, H1, search, and
filters into one crowded toolbar.

## Global search

Desktop opens a command-style overlay; mobile opens a full-screen search route.
Results group into Products, Organisations, Countries, and Capabilities. Each
result shows name, entity type, distinguishing context, and evidence count only
when useful.

- Start after two characters.
- Support keyboard selection and screen-reader result announcements.
- Use approved synonyms: PAYG/pay-as-you-go, C&I/commercial and industrial,
  AMI/advanced metering.
- Escape closes and restores focus.
- `See all results` opens `/search?q=`.

Zero result language: `No published record matched “…”.` Suggest close terms,
related categories, Clear filters, and Submit product. Never imply non-existence
or expose unreviewed candidates.

## Filter system

Visible controls:

1. Country
2. Energy segment
3. Category
4. Evidence
5. More filters

Then result count, active chips, and Clear all.

More filters contains origin, lifecycle, access model, open-source availability,
customer type, and freshness. Options show counts after other filters apply.

Desktop applies immediately. Mobile stages changes inside a full-height sheet
with `Show {n} results`; Cancel restores the prior state. Filter state persists
between Stack, Deployments, and Directory and serialises stable IDs into the URL.

## Visual system

### Colour

| Role | Value |
| --- | --- |
| Canvas | `#F7F7F2` |
| Surface | `#FFFFFF` |
| Ink | `#171816` |
| Muted ink | `#555B55` |
| Border | `#D9DDD5` |
| Action | `#0B57D0` |
| Action hover/pressed | `#0842A0` |
| Focus | `#005FCC` |
| Success | `#2D6A45` |
| Warning | `#925900` |
| Critical | `#A7352A` |

Market-condition colours appear only on category-level dots, thin edges, and
charts: commercial green, bundled/gated amber, donor-supported grey,
structurally thin red, insufficient evidence neutral.

Evidence pills remain neutral and differ by wording.

### Typography

- Display: 40/48, weight 650
- Page title: 32/40, weight 650
- Section: 24/32, weight 650
- Subsection: 20/28, weight 600
- Body: 16/24
- Compact UI: 14/20
- Metadata and data: 13/18, tabular figures

Primary stack: Inter, system sans-serif. Data stack: IBM Plex Mono, system
monospace. Fonts never block useful text. Prose width is 55–72 characters.

### Spacing and geometry

4px base scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.

- Mobile gutter 16px; tablet 24px; desktop 32px.
- Standard radius 8px.
- Pill radius only for filters and status labels.
- 1px borders.
- 2px focus ring with 2px offset.
- No resting card shadows.
- Interactive height at least 40px; major form actions 44–48px.
- Stack max width 1440px; data 1360px; standard 1200px; profiles 1120px;
  reading/forms 760px.

## Semantic components

One shared component owns each concept:

- `EvidenceStatus`
- `LifecycleTag`
- `Freshness`
- `OriginLabel`
- `MarketCondition`

Pages compose these components and never recreate their visual semantics.

### Product tile

Visible content only: product, organisation, origin wording, count-based evidence
line. Capability, model, lifecycle, and countries move to preview. The whole tile
is one interactive target; never nest clickable badges.

States: neutral default, darker-border hover, focus ring, selected cobalt border,
stale freshness wording, historical lifecycle in preview.

### Category band

Header: category, matching product count, market-condition dot and dated wording,
and View all/collapse. Show four to six tiles by width. Expansion occurs in place
and updates URL. Empty bands appear only with a meaningful research state.

### Evidence

Neutral labels:

- Provider claim
- Publicly sourced
- Independently evidenced
- Customer confirmed

Provider confirmation of a profile is separate from deployment evidence.

### Freshness

Always a date:

```text
Last checked 16 July 2026
Review due
Stale — last checked 4 February 2025
```

Stale remains readable and does not imply inactive.

### Product preview

Desktop 440–520px complementary drawer:

1. Back/context
2. Product and organisation
3. Origin and lifecycle
4. One-sentence description
5. Category
6. Evidence summary
7. Two to four deployments
8. Last checked
9. View full profile
10. Suggest correction

Mobile opens the full product page. Back returns focus and scroll to the opener.

### Country panel

Country, separate evidenced/claimed totals, category counts, three to five
deployments, View all in Directory, Open country page. Product selection
transitions to preview with `Back to {country}`.

### Geographic map and country grid

Desktop geographic view uses official geometry and island insets. Country fill
represents evidenced counts. Claimed coverage uses optional hatching; unknown
and zero are visually distinct.

The equal-area Country grid gives every state a selectable tile and is the
analytical/mobile alternative. ISO2 is visual; full country name is accessible.
A ranked list and country search provide non-spatial access.

No exact non-public infrastructure coordinates.

### Directory table

Server pagination: 25 default, 50/100 options. Default columns: Product,
Organisation, Category, Deployment countries, Access model, Evidence, Last
checked. Product is a normal link; row activation may open preview.

Sorting uses labelled buttons and announced direction. Column selection persists.
Mobile replaces the table with result cards.

### Forms

Single-column reading width. Persistent labels, helper text, precise errors,
comboboxes for existing entities, radio groups for exclusive choices, checkboxes
for multiple segments, URL inputs for evidence, conditional confidential-customer
fields, local non-sensitive drafts, review before submit, and a success page with
submission ID.

No success language says Published or Verified.

## Responsive rules

| Pattern | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Header | Inline | Reduced | Menu sheet |
| Filters | Inline menus | Wrap | Full-screen sheet |
| Stack | Category grids | 2–3 tiles | Stage/category accordions and rows |
| Deployments | Map/grid + side panel | Map + sheet | Ranked list first, grid second |
| Directory | Table | Reduced columns | Cards |
| Preview | Side drawer | Side/bottom sheet | Full page |
| Forms | Centred | Single column | Full width, sticky final action |

Layouts must reflow at 320 CSS pixels and 200% zoom.

## Accessibility release criteria

Target WCAG 2.2 AA:

- semantic landmarks and one H1;
- skip link;
- logical focus and no traps;
- visible focus not hidden by sticky UI;
- suitable target size and spacing;
- sufficient text/non-text contrast;
- no colour-only information;
- announced status updates without focus theft;
- field-level errors plus error summary;
- table captions and headers;
- list/table alternatives for maps;
- correctly named drawers/sheets;
- text zoom and spacing without clipping;
- reduced motion;
- language metadata; and
- no account required to browse.

## Performance and resilience

- Useful server-rendered content without client JavaScript.
- Initial compressed transfer target ≤300KB excluding fonts/map geometry.
- Two font families and no more than four font files.
- Load map code only where needed.
- No third-party advertising/tracking.
- Cache and paginate public data.
- No font/data layout shift.
- Map failure falls back to list/grid.
- Search has a standard results page.
- Forms preserve safe values after server errors.

## Content

UK English, sentence case, dated assertions, no hype. Use `No verified entry
found`, not `nothing exists`; `Provider claim`, not a vague tick; `Last checked`,
not `last updated` when only research was reviewed.

Display dates as `16 July 2026`; exports use ISO. Do not display empty labelled
fields—omit them or say `Not publicly documented` when absence is material.

## SEO and sharing

Entity pages are server-rendered with canonical URL, unique title/description,
breadcrumb metadata, last modified, and stable Open Graph card. Product social
cards show product, organisation, category, evidenced deployment-country count,
and last checked—never unsupported impact claims.

Filtered states are shareable. Canonicalisation prevents indexing every parameter
combination; selected high-value country/category landing states may be indexed.

## Analytics and privacy

Privacy-friendly aggregate analytics only. Measure search submitted/zero result,
filters, view switches, expansions, previews, profile/source opens, exports,
contribution starts/completions, and errors.

Never send free-text query, form content, confidential customer data, or source
excerpts to analytics.

## Motion

Hover/focus 120ms; drawer/sheet 180ms; map 300ms. No looping motion or mass tile
entrance. Reduced-motion mode uses instant state changes.

## Definition of done

- Page specification satisfied
- Core content server-rendered
- Shareable URL state
- Back restores context
- Keyboard/focus verified
- Screen-reader/reflow tested
- Performance budget met
- Analytics excludes sensitive content
- Evidence wording and source linkage accurate
- Automated and manual tests pass

Machine-readable values are maintained in
[`design/tokens.json`](../design/tokens.json).
