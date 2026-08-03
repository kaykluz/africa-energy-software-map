# Organisation directory and market graph

Status: Foundation implemented; wider organisation population remains Phase 2

## Decision

Expand the map with a first-class **Organisations** directory, but do not build
separate databases for EPCs, developers, financiers, advisers, operators and
institutions. An organisation has one canonical record and may carry several
sourced roles, segments, countries and software relationships.

The public product becomes a connected market graph:

```text
Organisation ── role ──────────────── Role
      │
      ├──────── segment ───────────── Segment
      ├──────── presence ──────────── Country
      ├──────── software relation ─── Product
      └──────── project party ─────── Project / transaction (later phase)
```

Tabs and routes represent durable object types. Roles and segments are
filterable dimensions and saved views. This avoids duplicate company records,
contradictory updates and a role-by-segment navigation matrix.

## What changes in the public information architecture

`/organisations` is now a first-class public object view rather than a role
tab. It lists organisations behind reviewed software, links to their stable
profiles and shows linked product and evidenced-country counts. "Organisation"
is used instead of "company" because the data also includes public bodies,
research communities and partnerships.

The deployment map has a Software/Organisations object switch. Selecting an
organisation does not infer a role such as EPC, developer or financier. Those
roles remain future filterable fields on the organisation record, so adding
market actors later will not create a tab for every role-by-sector combination.

The compact global navigation should evolve to:

**Map · Software · Organisations · Data · Method · Contribute**

- **Map** remains the prominent geographic entry point and receives software
  and organisation layers.
- **Software** opens the classified software wall.
- **Organisations** opens an organisation atlas with Atlas, Map and List views.
- **Data** provides exact tables, column selection and exports for either object
  type.
- **Method** explains inclusion, evidence, freshness and conflicts.
- **Contribute** remains a visible action rather than a passive footer link.

On narrow screens, the primary navigation is Map, Software, Organisations and
More. Contribute remains reachable from the header and contextual empty states.

Do not add permanent top-level tabs for every role or segment. URLs such as
`/organisations?role=epc&segment=c_and_i&country=GH` provide the useful view
without creating a new page to maintain.

## Hyperlink and graph-navigation contract

The public interface is a navigable graph. Whenever a displayed entity has a
stable internal destination, its visible name links to that destination.

| Displayed object | Destination |
| --- | --- |
| Product or software listing | Canonical product record |
| Organisation | Canonical organisation record |
| Country | Country record |
| Role or role family | Filtered Organisations view |
| Segment or technology | Filtered Software or Organisations view, according to context |
| Category or value-chain stage | Filtered Software view |
| Project or transaction | Canonical project or transaction record when introduced |
| Source title or publisher | Direct source URL or a future internal source record |

Names are linked in tables, cards, previews, map panels, relationship lists,
profiles, search results and change history. A relationship should be traversable
in both directions: an organisation profile links to its software, and a
software profile links back to its organisation; a country links to matching
organisations and their profiles link back to the country view.

Link only known identities. Do not guess a destination from a matching string,
silently link a customer name to the wrong organisation, or treat two similar
names as the same entity. Records without a stable destination remain plain text
and enter the identity-resolution queue.

Interaction rules:

- the entity name is a semantic anchor with a real URL, so it supports open in
  new tab, copy link, keyboard navigation and search indexing;
- a card that also supports quick preview uses a separate labelled preview
  button rather than nesting a link inside a button;
- a whole card may be a link only when it has one destination and no nested
  controls;
- Browser Back returns to the prior filters and scroll position; preview sheets
  remain the fastest way to inspect records without leaving a view;
- internal links are visually quiet and gain underline or contrast on hover and
  focus rather than making every surface blue;
- external source or official-site links are identified with an external-link
  cue and never replace the internal canonical record; and
- the final item in a breadcrumb and the current page heading are not
  self-links.

The data model therefore needs stable canonical URLs or entity IDs on every
relationship edge. Public rendering must use those identifiers rather than
fuzzy name matching.

## Organisation taxonomy

### Organisation value chain

The organisation atlas uses its own market chain. It does not reuse the six
software stages, because a financier, EPC, utility and software provider play
different organisational roles even when they support the same product stage.

| Position | Covers |
| --- | --- |
| Govern and coordinate | Regulators, market operators, ministries, public agencies, programmes, associations and standards bodies |
| Finance and de-risk | Investors, lenders, grant and RBF providers, guarantors, insurers and carbon finance providers |
| Develop and own | Developers, IPPs, asset owners, portfolio owners and energy-service companies |
| Supply and build | EPCs, OEMs, equipment suppliers, installers, distributors and system integrators |
| Operate and serve | Utilities, operators, O&M providers, asset managers, retailers and customer-facing energy services |
| Enable and advise | Software, data, research and professional services |

An organisation may occupy more than one position through separately reviewed
roles. The position is derived from the role vocabulary and is used for visual
grouping only. It is not a ranking, score or assertion of capability.

The first reviewed release is software-led. Current role and sector displays
therefore follow existing reviewed product relationships; they do not claim
that the wider EPC, developer, capital or institutional landscape is complete.

### Role families

Role families organise the atlas. Specific roles do the filtering. An
organisation may have several roles, but one reviewed role may be marked primary
for default visual grouping. Primary means presentation only; it is not a rank
or statement of importance.

| Role family | Initial controlled roles |
| --- | --- |
| Project ownership | Developer, independent power producer, asset owner, portfolio owner, energy-service company |
| Delivery and operations | EPC, O&M provider, operator, installer, OEM, distributor, system integrator |
| Capital and risk | DFI or development bank, commercial bank, equity investor, debt fund, blended-finance facility, grant or RBF facility, guarantor, insurer, carbon finance provider |
| Digital and enabling services | Software and data provider, research institution |
| Professional services | Legal adviser, financial or transaction adviser, technical adviser or owner's engineer, ESG or impact adviser, market research or data provider |
| Market institutions | Utility, offtaker, regulator, ministry or agency, programme or facility, association, research institution, standards body |

The taxonomy describes what an organisation does. It does not imply quality,
capacity, availability or a completed project.

### Energy segments

Segments describe where an organisation plays and remain independent of role:

- utility-scale generation;
- transmission and distribution;
- mini-grids;
- off-grid solar, SHS and PAYGo;
- C&I and distributed energy;
- e-mobility, charging and battery swapping;
- clean cooking;
- energy efficiency and demand services;
- productive use of energy; and
- carbon and environmental markets.

Storage is normally a cross-cutting technology tag because it appears in
utility-scale, mini-grid, C&I, SHS and e-mobility contexts. Solar, wind, hydro,
geothermal, bioenergy, thermal generation and hydrogen are also technology
tags, not substitutes for market segment.

Segment membership is a sourced classification. It does not by itself establish
a project, customer or operating presence.

## Software relationships

Do not add a `has_software` boolean. It would collapse several different facts
and make missing research look like evidence of absence.

Model explicit relationships between an organisation and a listed product:

| Relationship | Meaning |
| --- | --- |
| Owns | The organisation owns the product or product business. |
| Develops | The organisation builds or maintains the product. |
| Operates internally | The organisation uses a named internal system. |
| Uses | A source establishes use of a third-party product. |
| Implements | The organisation deploys the product for others. |
| Integrates | The organisation connects the product to other systems. |
| Resells | The organisation is an evidenced reseller or channel partner. |

The interface derives four useful filters from these relationships:

- **Owns or develops listed software**;
- **Uses listed software**;
- **Implements, integrates or resells listed software**; and
- **Software relationship not yet reviewed**.

The last label is deliberate. The public site must not say that an organisation
“has no software” unless a dated, reviewable source supports that unusually
strong claim. A reviewed search that finds nothing may be recorded as **no
public link found as of {date}**, which is still different from no software.

## Organisation geography

Keep four geographic concepts separate:

1. country of origin;
2. current headquarters;
3. evidenced operating or project presence; and
4. provider-claimed market presence.

An international organisation belongs in the directory when it has a sourced
role in African energy. It appears on the Africa map through evidenced or
claimed African presence, not by pretending its headquarters are in Africa.

Presence is country-level by default. Offices, availability and project
participation are separate presence types. No precise asset coordinates are
needed for the organisation directory.

## Organisations page

Route: `/organisations`

### Compact header

- title: **Organisations**;
- unique organisation count;
- countries with reviewed presence;
- last release date;
- search; and
- **Add an organisation** action.

Do not use a large hero, an eyebrow or explanatory paragraphs. Method detail is
one link away.

### Default Atlas view

The atlas is the organisation equivalent of the software wall. It is grouped by
role family and ordered alphabetically within each group.

Each tile contains only:

- approved logo or typographic identity mark;
- organisation name;
- primary display role;
- up to two segment markers; and
- a small software-relationship indicator.

Tiles have equal visual weight. Logo availability, company size, contributor
status and commercial relationship never affect order or prominence. An
organisation appears once in the default atlas. Selecting a secondary role
filter may return the same canonical organisation in that saved view.

Project ownership and delivery sections open by default. Capital, professional
services and market institutions use compact progressive disclosure. Active
searches open every section containing a match.

### Map view

The map reuses the accessible Africa country grid and eventual licensed
geographic view. It never uses office or project coordinates.

Primary layer controls:

- Evidenced presence;
- Claimed presence;
- Headquarters;
- Origin; and
- Software-connected organisations.

The software layer counts organisations with at least one reviewed relationship
to a listed product. It does not calculate a misleading “companies without
software” percentage while research coverage is incomplete.

Selecting a country opens a side panel with:

- unique organisation count;
- role-family breakdown;
- segment breakdown;
- organisations that own or develop listed software;
- organisations with other reviewed software relationships;
- organisations whose software relationship is not reviewed; and
- a link to the filtered List view.

Counts may overlap across roles and segments, so the panel labels them as
breakdowns rather than summing them into a false total.

### List view

The list is the precise working surface. Desktop defaults to rows; mobile uses
cards. Default columns are:

- organisation;
- primary role;
- other roles;
- segments;
- evidenced African countries;
- software relationship;
- lifecycle;
- last checked; and
- evidence state.

Users may add origin, headquarters, technology tags and source count through
column selection. Exports contain all matching records, not only the visible
page.

### Layered filters

Keep the first row short:

- Search;
- Role;
- Segment;
- Country; and
- More.

The More panel contains:

- role family and specific multi-role selection;
- presence type: operates, project, office, claimed;
- origin and headquarters;
- Africa relationship;
- software relationship;
- technology;
- lifecycle;
- evidence class;
- freshness; and
- profile-claim status.

Active filters appear as removable chips and are encoded in the URL. A user can
share or cite a view such as “EPCs working in C&I in Ghana.” Filters apply
identically to Atlas, Map, List and export.

Sorting options are alphabetical, recently checked and number of evidenced
African countries. Search relevance is available only during a text search.
There is no quality, popularity or sponsored sort.

## Organisation preview and profile

Selecting a tile, map result or row opens the same preview sheet without losing
filters. The preview contains:

- name, identity mark and lifecycle;
- primary role plus secondary roles;
- segments;
- evidenced African country count;
- software-relationship summary;
- last checked; and
- Open profile / Suggest correction actions.

The full profile uses progressive sections:

1. **Overview** — identity, origin, headquarters, lifecycle and website.
2. **Roles and segments** — sourced, dated classifications.
3. **African presence** — evidenced and claimed countries kept separate.
4. **Software connections** — Owns, Develops, Uses, Operates internally,
   Implements, Integrates and Resells.
5. **Projects and transactions** — appears only when later datasets exist.
6. **Sources and changes** — field-level evidence and history.

The software section should lead with connected product cards, not prose. If no
relationship has been reviewed, show **Software relationship not yet reviewed**
and a contribution action.

## Capital requires a linked object, not extra organisation columns

Capital is the best first deep role view after the broad organisation foundation
because the information is useful and poorly maintained elsewhere. However,
instrument and ticket data must not be stored directly on a financier's
organisation row. One institution may have several funds, facilities and
instruments with different dates, currencies and mandates.

Add a linked capital vehicle or facility record with:

- vehicle or facility name;
- managing organisations;
- instrument types;
- ticket minimum and maximum with currency and date;
- project or company stage;
- hard-currency and local-currency capability;
- countries and segments;
- investment-period start and end;
- current observed status;
- last checked; and
- assertion-level sources.

Use neutral, sourced statuses such as **investing**, **follow-on only**,
**deployment period ended**, **closed** and **unknown**. Do not publish labels
such as “zombie”, fund quality scores or unsourced availability judgments.

Similarly, developer operating capacity and pipeline are dated portfolio
metrics, not permanent organisation attributes. Operating, construction and
claimed pipeline values remain separate and retain their measurement date,
unit, scope and source.

## Transactions, country structure and programmes

These are valuable connected datasets but not extra organisation tabs:

- a transaction is its own dated object with parties, instrument, amount
  disclosure, status and sources;
- a project is its own object with organisation-party roles;
- country market structure is a versioned country dataset; and
- a programme or funding window is a time-sensitive facility object.

They may link back to organisation profiles and appear as map layers after their
own schema, review cadence and release gates exist. Building them as independent
objects prevents an organisation row from becoming an unmaintainable collection
of current and historical claims.

## Editorial position

The directory is inclusion-first and evidence-disciplined. It maps organisations
and distinguishes evidence states; it does not grade companies.

The defensible differentiation from decaying directories is:

- one canonical identity rather than duplicated lists;
- dated roles, segments and market presence;
- claims separated from independent evidence;
- explicit unknown and not-reviewed states;
- connected software, project and transaction relationships;
- field-level sources and change history; and
- reproducible filters and exports.

Market analysis may be published at category or country level when it has dated
sources and a named editorial review. It must not become a hidden vendor score.
Commercial conflicts and reviewer recusals belong in private operations, not in
public records, datasets or exports. The same neutral inclusion and sourcing
rules apply to collaborators and competitors.

## Data model extension

Add first-class relationship records rather than delimited fields:

| Record | Required fields |
| --- | --- |
| Role | stable ID, family ID, label, definition, status |
| Organisation role | stable ID, organisation ID, role ID, primary-display flag, validity dates |
| Organisation segment | stable ID, organisation ID, segment ID, validity dates |
| Organisation presence | stable ID, organisation ID, country, presence type, evidence state, validity dates, last checked |
| Organisation software relationship | stable ID, organisation ID, product ID, relationship type, validity dates, last checked |
| Technology tag | stable ID, label, definition |
| Organisation technology | stable ID, organisation ID, technology ID, validity dates |

Every relationship record can be the subject of atomic assertions and sources.
Names and classifications may change without changing the organisation ID.

The canonical optional table templates are:

- `organisation-roles.csv`;
- `organisation-sectors.csv`;
- `organisation-segments.csv`; and
- `organisation-software-relationships.csv`.

Older release packages remain valid without these optional tables. A future
package that includes one must use the controlled IDs in `data/taxonomy.json`;
repository validation checks identities, vocabulary values and dates.

Do not expose private reviewer conflict notes, submitter contact details or
commercial disclosures in any public table, snapshot, API response or export.

## Contribution and maintenance

The organisation form asks for:

- organisation name and website;
- proposed roles and segments;
- African countries and type of presence;
- any named software relationship;
- mandatory direct source URL; and
- optional public-safe note.

Contributions create candidates. They never update a public profile directly.
Contributors provide facts and sources; reviewers decide field wording,
evidence class and publication.

Each public role, presence and software relationship carries a last-checked
date. Review cadence is risk-based:

- active capital vehicles and programme windows: monthly or quarterly;
- active organisation lifecycle and operating presence: six months;
- stable identity, origin and historical relationships: annual;
- failed links or disputed assertions: immediate review queue.

Quarterly coverage reports may state what was added, corrected, retired and not
yet researched. They must not claim completeness.

## Delivery sequence

### 1. Foundation

- approve role, segment, presence and software-relationship vocabularies;
- add schemas, templates, assertions and validation;
- extend private review and bulk-import flows; and
- generate organisation records from the same reviewed release pipeline.

### 2. Seed and reconcile

- extract candidate organisations from current product owners and standalone
  catalogue entries;
- deduplicate legal names, trading names, subsidiaries and group companies;
- attach roles and segments only where sources support them;
- link existing products through Owns or Develops relationships; and
- keep private disclosures out of all candidate and release artefacts.

### 3. Public directory

- ship `/organisations` with Atlas and List views;
- add preview sheets and expanded profiles;
- add URL-persistent filters and organisation exports; and
- expose reviewed software relationships.

### 4. Map layer

- add evidenced and claimed organisation-presence layers;
- add the software-connected layer;
- reconcile country-panel counts with filtered exports; and
- retain country-grid and keyboard alternatives.

### 5. Deep role views

- add capital vehicles and facilities first;
- add project and transaction objects;
- add dated developer portfolio metrics; and
- add programme windows only with an owner and review cadence.

## Release gates

Do not publish the expanded directory until:

- every organisation has one canonical stable ID;
- roles, segments, presence and software relationships are source-linked;
- a missing relationship is never rendered as “does not have”;
- an organisation can hold multiple roles without duplicate canonical records;
- evidenced and claimed market presence remain separate;
- Atlas, Map, List and export return the same filtered population;
- all counts use unique organisations and explain overlapping breakdowns;
- filters and view state survive sharing, Back and route changes;
- unknown, not reviewed, not found and not applicable remain distinct;
- public artefacts exclude private disclosures and contact data;
- keyboard, screen-reader, reflow and reduced-motion tasks pass; and
- a moderated user can find an EPC in a segment and country, trace a software
  relationship, and export the result without reading the methodology.
