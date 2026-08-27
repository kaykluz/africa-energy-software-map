I located the full sweep results in the workflow journal (`/root/.claude/projects/-home-user-africa-energy-software-map/bfd2e634-c531-59c5-ab5c-0f6defae34b1/subagents/workflows/wf_6f1a4aed-892/journal.jsonl`; consolidated copy written to `/tmp/claude-0/-home-user-africa-energy-software-map/bfd2e634-c531-59c5-ab5c-0f6defae34b1/scratchpad/register-sweep.json`) and cross-checked against the earlier EPC-sweep artifacts in the scratchpad. All 54 countries were assigned across the six regional agents — no country was skipped by design. 102 sources, 73 live.

## 1. Countries with NO live regulator/agency URL — 15 of 54

**Genuinely offline — no crawlable official web presence exists (10):**
- **Mali** — CREE (creemali.ml) and AMADER (amadermali.net, amader.ml) all DNS-dead. Institutions active (tenders via malipages.com) but websites are gone.
- **Guinea** — aree-gn.com DNS-dead; aree.gov.gn resolves but serves an empty page.
- **Guinea-Bissau** — regulator ARAE (decreed 2018) never had a site; utility EAGB's domain is an expired-domain parking page (confirmed by opening it).
- **South Sudan** — ministry exists only on Facebook; SSEC has no site; goss-online.org defunct.
- **Eritrea** — no discoverable ministry site at all; donor-documents-only country.
- **Congo-Brazzaville** — ARSEL exists in law but has no website; RegulaE.Fr members page lists it with no URL.
- **Gabon** — arseegabon.com DNS-dead (lapsed).
- **Chad** — arse.td is hijacked, now serving gambling spam. Must be blocklisted, not crawled.
- **CAR** — ARSEC abolished by law in Aug 2021; no ministry site found either.
- **Comoros** — no regulator exists yet (only planned); utility SONELEC's domain times out at DNS.

**Environment-blocked — a site exists online; the sweep's fetcher failed, not the country (5):**
- **Ethiopia** — PEA returns 503 but is search-indexed with 2025 content.
- **Namibia** — ECB 503 + broken TLS chain; search shows /licensing/ holds distribution-licensee and IPP lists. A browser will recover this.
- **Sudan** — era.gov.sd is DNS-dead (probably genuinely gone), but mop.gov.sd is search-indexed and merely times out — war-degraded hosting; try Wayback.
- **Equatorial Guinea** — both ministry domains 503; ambiguous, retry from a browser.
- **Seychelles** — SEC 503; search says "under construction" — probably genuinely down, but cheap to re-verify.

Note Kenya, Egypt, and Madagascar are NOT gaps only because an agency saved them (REREC, NREA, ADER); their actual regulators (EPRA, EgyptERA, ARELEC) are all blocked. EPRA's block is real, not transient — the earlier EPC sweep's `epra_contractors.pdf` in scratchpad is actually an "upstream connect error" text file, not a PDF.

**Blunt audit of the sweep itself:** (a) No archive.org fallback was attempted anywhere, despite the agents repeatedly recommending it to "a human" — Wayback would likely serve EgyptERA's licence PDFs, Sudan's ministry, and Power Africa's tracking tool today, no human needed. (b) Browser-UA spoofing was proven to work on MERA Malawi and PURA Gambia but was not systematically retried on ECB Namibia, PEA Ethiopia, SEC Seychelles, aser.sn, aber.bf, or aer.cm — some of those 15 "blocked" verdicts are probably one header away from live. (c) ERERA (regional, 403-blocked) is the natural coverage patch for the dead ECOWAS francophone regulators (Mali, Guinea, Guinea-Bissau) and nobody attempted its archive copy.

## 2. Top 10 verified registers by expected companies-per-fetch

1. **ERA Uganda — Certified Installation Permit Holders** (era.go.ug/certified-installation-permit-holders/). One plain-HTML fetch. The register sweep said "1000+"; the earlier EPC sweep actually extracted it — **4,515 rows** sit in scratchpad `era_rows.json` with company, location, permit no., class, dates, phone. Highest single-fetch yield on the continent. Caveat: needs natural-person filtering.
2. **Norfund investment overview** — one Excel download = the entire direct + fund-investee database (updated Apr 2026). Hundreds of names per fetch.
3. **FMO World Map** — 1,316 investments with name/amount/date/country/sector; filterable, almost certainly a JSON endpoint behind it.
4. **DEG disclosure database** (deginvest-investments.de) — one CSV export of every commitment since 2015 with customer names. Ignore the JS shell; take the CSV.
5. **ZERA Zimbabwe liquid-fuels licensees** — ~1,200 rows in one HTML table. Caveat: ~1,100 are retail fuel stations, marginal to the atlas; the same site's solar-installer page is smaller but more on-target.
6. **Ghana Energy Commission regnew** (energycom.gov.gh/regnew/) — 11 registers behind one app (generation/wholesale, distribution, renewables installers, gas...). Hundreds of licensed companies for ~11 predictable fetches.
7. **EDFI ElectriFI/AgriFI** (edfimc.eu/our-projects/) — 137 investments in one listing, near-100% relevance (off-grid/mini-grid/cooking companies with stage and business model).
8. **World Bank Projects API v3** (search.worldbank.org/api/v3/projects) — thousands of JSON records across 30 countries; huge volume but LOW company density — counterparties are governments. Rank it for breadth, not names (see Q3 for the fix).
9. **NERC Nigeria reports** (nerc.gov.ng/resource-category/nerc-reports/) — each quarterly/annual PDF carries licensee, mini-grid-permit and meter-provider tables; dozens of companies per PDF, quarterly cadence.
10. **ARENE Mozambique** — electricity concessionaires as a direct Excel download, one fetch, plus per-sector operator lists.

Bubbling under: Proparco (~780 projects but paginated at 20/fetch × 39), REPP (43 companies, one fetch, extremely on-target), MERA Malawi (monthly licensee PDFs, browser-UA required), EWURA Tanzania (find the JS table's data endpoint first), Masen (60+ projects), ESERA (~40 installers). EWRC Sierra Leone is disqualified until fixed — its register PDF is server-truncated at exactly 1 MiB and unparseable. NERSA is effectively not a crawl target (JS document library + login-walled PowerApps portal).

## 3. Financier databases most likely to surface companies regulators won't

Regulator registers only work in ~⅔ of countries and skew to licensed grid-scale operators and installers. Financier novelty = pre-licence and off-grid companies, plus anything in the 15 zero-coverage countries. Ranked:

1. **EDFI ElectriFI** — highest novelty per record: off-grid/mini-grid/clean-cooking investees explicitly covering Mali, Sierra Leone, Benin, Togo, DRC, Zimbabwe — companies most regulators never license.
2. **REPP** — 43 named portfolio companies including Nuru (DRC), ARC Power (Rwanda), Bboxx — concentrated in dead-regulator countries.
3. **Norfund** — fund fan-out reaches small energy-access companies invisible to any register; and it's one Excel.
4. **Proparco** — francophone tilt lands exactly where regulator coverage collapsed (Mali, Guinea, Chad, Madagascar).
5. **FMO** — broad Energy-filterable client names including gap countries.
6. **DEG** — customer names in CSV; some overlap with FMO/Proparco.
7. **IFC Disclosures** — names private sponsors; JS-heavy, medium effort.
8. **GEAPP** — only 17 projects and partners unnamed on cards; low volume.
9. **CIF and GCF** — deprioritize for company discovery: their records name MDBs, accredited entities and government implementers, not companies.

**Blunt gaps:** (1) The single highest-novelty machine-readable source is missing from the register entirely — the **World Bank Contract Awards / procurement dataset**, which names the actual EPC contractors and suppliers winning energy contracts in precisely the no-regulator countries (South Sudan, Chad, Guinea, Mali). The Projects API that was registered names governments; contract awards name companies. Add it. (2) The blocked quartet — **AfDB/SEFA (entire estate WAF'd or DNS-dead), BII, MIGA, Oikocredit** — is collectively the biggest untapped pool, especially AfDB for francophone and fragile states; these need one human browser session or a headless-browser crawler, and AfDB should be top of that queue. (3) Power Africa's transaction tracker is dead with USAID, but its historical data (hundreds of private deals) survives on Wayback — one human hour, never scheduled. (4) The financiers' country arrays are self-declared "representative", so coverage math against 54 countries cannot be computed from this register — and Eritrea, Comoros, São Tomé and Guinea-Bissau appear in almost no financier footprint listed, meaning the gap countries from Q1 are mostly also financier-dark.