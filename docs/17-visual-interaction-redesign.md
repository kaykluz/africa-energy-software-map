# Visual interaction redesign

Status: Phase 1 implementation direction
Version: 2.1
Date: 30 July 2026

This document supersedes the presentation and motion rules in
[14 — Phase 1 UI/UX design system](14-phase-1-ui-ux-design-system.md) where
they conflict. The evidence, accessibility, geography, export and editorial
rules in the earlier specifications remain normative.

## Product direction

**A visual atlas with a data room underneath.**

The first interface explained the registry too often and too early. Version 2
lets people understand the system by moving through it. The primary experience
is visual, spatial and responsive; rigorous detail remains one interaction away.

The redesign combines:

- visual-first editorial sequencing, informed by the
  [New York Times Year in Graphics](https://www.nytimes.com/interactive/2023/us/2023-year-in-graphics.html);
- large-scale type, confident pacing and meaningful transitions, informed by
  [Trionn](https://trionn.com/); and
- sparse chrome and exploratory play, informed by the
  [Obys Experiment Space](https://experiment.obys.agency/).

These are directional references, not templates. The registry must stay faster,
clearer, more accessible and more data-literate than a studio showcase.

## One database interaction model

### Cards and Wall

For people who want to understand the landscape, discover products or follow the
energy value chain.

- large visual hierarchy;
- stage, country and product as the primary objects;
- one selected context at a time;
- short labels and count-based signals;
- hover, focus and selection motion that explains what can be opened; and
- no methodology paragraph in the main task path.

### Reviewed release table

For academics, analysts, journalists, investors, operators and public
institutions who need structured records.

- compact filters and stable URLs;
- sortable table and scan-friendly cards;
- neutral evidence wording;
- last-checked dates;
- column selection;
- filtered CSV and JSON export; and
- links to source and methodology detail.

All representations use the same records and filter vocabulary. Review state is
shown on cards and is directly filterable. The reviewed release table is an
audit-oriented representation, not a separate public database.

## Information layering

The interaction ladder is:

1. **Signal** — name, count, stage or country.
2. **Selection** — selected stage, country or product.
3. **Preview** — one-line context, evidence count and essential status.
4. **Record** — full product, organisation or country profile.
5. **Proof** — assertion-level evidence, source and editorial history.

No screen should expose layers 1–5 simultaneously. Method notes use disclosure
controls. Product detail uses a drawer. Full evidence belongs on the record.

## Global shell

### Header

The desktop header has three destinations:

1. Database
2. Map
3. Method

`Improve the map` is a labelled primary action. Search and prototype status are
compact controls. Method, downloads, changes and accessibility live in the
expanded menu. Prototype status is a quiet signal with an accessible label; its
explanation appears only when selected.

The mobile header keeps the mark, status, search, `Improve the map` and menu.

### Search

Search opens as a large, focused canvas:

- one prominent input;
- four useful starting terms before typing;
- live product, capability and country matches;
- index, type and distinguishing context per result;
- a full-results route after two characters; and
- Escape closes and restores focus.

Search copy must never imply that no matching record means no product exists.

### Footer

The footer is a low-density utility line: project, version, Method, Downloads,
Licence, GitHub and Improve the map. It does not repeat the site architecture.

## Database page

### Opening

The page opens with the compact title `Database`, object tabs for Software and
Organisations, and view tabs for Cards, Wall and Map. Three small dataset numbers
establish scale. A labelled `Improve the map` action links directly to
contribution routes.

The opening has no eyebrow or slogan below the title. Core page titles use a
compact display scale so useful controls and data remain visible in the first
viewport.

### Value-chain route

The six stages form a selectable route. The route is the main navigation object,
not a set of long accordion reports.

- current stage uses a cobalt node and completed route line;
- each stage shows its index, label and matching product count;
- desktop keeps the route visible while the stage scene changes;
- mobile turns it into a horizontal, snap-aligned rail; and
- previous/next controls provide a linear alternative.

### Stage scene

Only one stage scene is visible. It contains:

- a large stage name;
- product and category totals;
- category fields;
- product capsules; and
- minimal research-empty states.

Category cards expose only category, count and a non-colour market signal.
`Market note` reveals the dated verdict. Product capsules expose product,
organisation and evidence count. Selecting one opens the product preview.

The cross-cutting data/interoperability/security category is a single dark band
under the selected scene.

## Map page

The map is a layered data field, not a decorative pin map.

### Controls

- Object: Software or Organisations
- Software location: All recorded, reviewed deployment, catalogue location,
  Africa-wide coverage or publisher headquarters
- Organisation presence: All recorded, catalogue activity, Africa-wide coverage, evidenced activity,
  company-stated activity, software deployed, office/entity, product
  availability, headquarters or origin

Representation switches between geographic map, equal-area grid and ranked
list. All-recorded is a de-duplicated union; every underlying type remains
labelled and independently selectable. Headquarters, catalogue locations and
company statements never become deployment evidence.

An explicit Africa-wide catalogue scope appears in every country view for
discovery but carries an `Africa-wide coverage` label. It never becomes an
exact-country assertion, headquarters, office or deployment.

### Country field

Every African state receives an equal-size selectable tile. This prevents small
and island states from disappearing. ISO2 is visual; the accessible name contains
the full country and coverage status.

- neutral tile: no location matches the current layer and filters;
- teal tile: matching record count;
- cobalt tile: current selection; and
- acid hover: interaction affordance, never a data meaning.

The country panel shows the selected country, matching records, their location
types and a link to the country record. Country boundaries are navigation only;
no site coordinates are published.

## Data page

The Directory is the academic and power-user workspace.

- sticky search and filters;
- row/card switch;
- sort and column controls;
- neutral semantic tags;
- normal product links;
- preview action per record;
- current release and date; and
- filtered export.

The export panel states record count, format, source-URL option and candidate
status before download. CSV and JSON derive from the same filtered rows shown on
screen.

On narrow screens the table remains horizontally available and the Cards mode
offers the primary scan pattern. Product profiles remain directly linkable.

## Product preview

Product selection opens a layered drawer with:

- large product identity;
- organisation;
- three count metrics;
- Overview and Evidence tabs;
- capability rows;
- deployment evidence rows;
- full-record link; and
- correction link.

The preview does not duplicate the full profile. Escape or Close returns focus
to the opening product.

## Secondary pages

Methodology, contribution, data releases and policy pages remain text-capable
because their job is precision. They use the same quiet shell but do not imitate
the large Explore canvas. Their content rules are:

- one page title and a plain orientation only when needed;
- short in-page navigation;
- summary before procedure;
- disclosure for worked examples and edge cases;
- tables for exact mappings;
- no repeated prototype or AI disclaimers; and
- no decorative animation in long-form reading.

## Content budget

Main discovery surfaces follow these limits:

- no standalone slogan below a core page title;
- one line per empty state;
- no paragraph on a closed card;
- no more than three small statistics in an opening;
- status wording instead of explanatory badges;
- details on selection, not on hover alone; and
- no generated marketing copy.

“AI” appears only in methodology, workflow or provenance where it materially
changes interpretation.

### Copy audit

Public interface copy must read like labels, records and instructions rather
than generated promotion.

- remove rhythmic fragments when the controls already explain the page;
- avoid constructions such as `X first. Y stays separate.`;
- avoid `designed to`, `built to`, `unlock`, `seamless`, `discover` and similar
  promotional filler;
- avoid artificial `not X, but Y` contrasts unless the distinction is required
  for evidence accuracy;
- use a direct noun or verb for headings: `Review process`, `Release files`,
  `Search`; and
- keep references to automated research inside methodology and source guidance.

## Colour and material

Resting UI uses warm paper, ink and hairline borders. Cobalt is the sole action
colour. Teal is the evidence/data signal. Acid is a brief interaction highlight.
Coral is reserved for structural or caution signals.

Large filled semantic colour panels are prohibited. Evidence status remains
neutral and uses wording. Colour never carries meaning alone.

## Motion

Motion must teach structure:

- title reveal introduces the page once;
- route line shows value-chain progress;
- selected stage cross-fades and rises into place;
- product capsules move slightly toward the opening direction;
- drawers and panels arrive from the edge they occupy;
- country tiles respond to focus/hover/selection; and
- all state changes are instant under `prefers-reduced-motion`.

There is no looping decoration, autoplay audio, scroll hijacking or pointer-only
interaction. Tile entrance is a brief progressive enhancement, not a loading
dependency.

## Accessibility and resilience

- one H1 and semantic landmarks;
- skip link and visible focus;
- full keyboard access;
- labelled modal panels and tabs;
- no colour-only status;
- grid/list alternatives to geography;
- server-rendered core records;
- usable at 320 CSS pixels;
- reduced-motion support; and
- no account required to browse, export or correct.

The build must still pass repository validation, lint, type checks and rendered
route tests.

## Acceptance tasks

1. Move from Explore to a value-chain stage in one interaction.
2. Open a product preview in one further interaction.
3. distinguish evidence count from provider claim wording.
4. select Nigeria and inspect a deployment without reading methodology.
5. switch from Map to Data without losing filters.
6. export the currently visible data in CSV or JSON.
7. find an unassessed country and understand that it is not a zero.
8. complete all tasks with keyboard and reduced motion.
9. locate methodology, source and correction paths when precision is needed.
10. identify the prototype status without it dominating the interface.

## Implementation map

- `web/components/site-shell.tsx` — global navigation, search and status layers.
- `web/components/registry-explorer.tsx` — Explore, Map, Data and product preview.
- `web/app/visual-system.css` — version 2 visual and motion system.
- `design/tokens.json` — machine-readable presentation tokens.

Capacity, data-boundary and future-scope rules are defined in
[`18-expansion-architecture-and-roadmap.md`](18-expansion-architecture-and-roadmap.md).
