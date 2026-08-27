## 1. High-value source types not reached

Verified still unreachable from this environment just now (`000`/`403`/`503`, no Wayback snapshots exist for any of them):

**Regulator registers behind bot/WAF protection or dead hosts — the biggest class of loss**

| Source | Status | Where a human should look |
|---|---|---|
| EPRA Register of Active Solar PV Contractor/Vendor (KE) | whole `epra.go.ke` host TCP-resets; no archive copy | Browser on a Kenyan/residential IP: `epra.go.ke/sites/default/files/2024-11/REGISTER OF ACTIVE SOLAR PV CONTRACTOR VENDOR.pdf`, plus the technician register and the 2019 `SOLAR_PHOTOVOLTAIC_CONTRACTOR_REGISTER.pdf`. Or email EPRA licensing directly. |
| ZERA "REGISTERED RE SERVICE PROVIDERS [14 Apr 2026]", 43pp (ZW) | JS security interstitial, 401/403 to every non-browser agent | Open `zera.co.zw/recommended-solar-companies/` in a real browser and pull the PDF from the simple-file-list directory. Also `/independent-power-producers/`. |
| Ghana EC "Installation & Maintenance BY ALPHABETICAL ORDER" PDF | HTTP 500, not archived | Request from Energy Commission directly. Secondary sources cite "over 100 licensed installers" against the 27 rows the live `regnew` register serves — the live register is probably a truncated view. |
| `annuairehorsreseau.gouv.sn` (SN government off-grid actor directory) | broken TLS cert chain + 503 | Browser with cert warning accepted. This is the single best Francophone West source and it produced nothing. |
| COPERES "Nos membres" (SN) | 503 with `Retry-After: 600`, still 503 | Retry; ROGEP states 30+ member firms. |
| `minigrids.go.tz/en/Directory` (TZ government mini-grid hub) | DNS NXDOMAIN — portal appears dead | Ask EWURA/REA Tanzania whether it moved. There is no other TZ mini-grid developer register; EWURA publishes no licensee list at all. |
| ENF Solar per-country installer directories | Cloudflare 403 Africa-wide (KE, EG, GH, ET, CI…) | Browser session. This one blocked source covers every market in the sweep. |

**Source types that structurally do not exist online and need an information request, not a fetch:** Zambia ERB (licence categories published, licensee list only behind the `portal.erb.org.zm` login; the 34-licence story is paywalled at diggers.news), Malawi MERA (no register anywhere), Algeria CREG (procedure only — Algeria has no public licensee register, hence 8 rows), Uganda UECCC/UNBS (87 certified companies stated, none named).

**Award lists that named counts but not companies:** KOSAP's 14 mini-grid EPC winners and 19 debt-facility recipients, Nigeria REA/NEP's 18 developers and UEF's 19 grantees, Benin OCEF's 11 contractors, BRILHO Mozambique's grantees. Every one of these is a clean FOI-style email to the fund manager (SNV, REA, MCA-Bénin, BRILHO).

One correction to the sweep's own notes: CRSE Senegal was written off on a 404, but `crse.sn` is live and serves an operator register — it just contains 208 **downstream hydrocarbons** operators (distribution/transport/import/storage), and the electricity side names only Senelec, IPPs, CER and CERD as *categories*. So the conclusion was right by accident; the reachability note was wrong.

## 2. Countries and segments still badly under-covered

**Zero rows, 16 countries:** Angola, Botswana, Cabo Verde, CAR, Chad, Comoros, Congo-Brazzaville, Equatorial Guinea, Eswatini, Gambia, Guinea-Bissau, Libya, Mauritania, Mauritius, São Tomé, Seychelles. Angola and Mauritius are not defensible omissions — both have real solar installer markets and no market was assigned to them.

**Token coverage (1–5 rows), 14 countries:** Rwanda (2), Togo (2), South Sudan (2), Cameroon (1), Namibia (1), Gabon (1), Lesotho (1), Liberia (1), Burundi (1), Malawi (4), Sierra Leone (5), Djibouti (4), Sudan (3), Eritrea (1). Rwanda at 2 rows is the worst single outlier — it has an active EPD/REG-licensed installer market and a mini-grid programme, and it was only ever touched incidentally by the pan-African sweep.

**Kenya is the headline failure.** 51 rows for one of the two deepest solar markets on the continent, from a 13-row KEREA directory, a KOSAP newsletter and AMDA. One blocked host reduced a flagship market to noise.

**Ivory Coast: 6 rows** against FIACER's own claim of 110+ member SMEs. **Egypt: 103 rows**, but all of them from `pv-hub.org` (86) and a Benban project page (17) — those 17 are foreign IPPs and EPCs, not Egyptian firms. No Egyptian regulator source was attempted at all.

**Segments:** 516 of 1,276 rows (40%) carry **no segment**. Clean cooking (6), efficiency/demand (5), e-mobility (7) and storage (20) are effectively unsampled — the sweep was a solar-PV-installer sweep wearing an energy-sector label. Transmission/distribution at 23 is similarly thin.

**Evidence quality:** only **178 of 1,276 rows (14%) carry a website**. 398 of 481 South African rows and all 103 Egyptian, 87 Tunisian and 51 Kenyan rows are name-only. Those rows are close to unresolvable against the existing catalogue and will generate a large manual-review load.

## 3. Remaining population and the next action

**Size of the hole.** Effective distinct organisations in the sweep is **~1,124, not 1,276** — 95 rows are same-name/same-country duplicates (PowerGen ×6, Ogin ×7, Renewvia ×5, Anzana ×5, RVE.SOL ×5), mostly the pan-African mini-grid pass re-listing firms the country passes already had. Against the named gaps above:

| Gap | Est. rows |
|---|---|
| Uganda ERA company permits discarded (see below) | ~209 |
| Kenya EPRA contractor/vendor register | 400–800 |
| Zimbabwe ZERA 43-page RE service provider register | 500–800 |
| Egypt regulator/association lists (never attempted) | 300–600 |
| ENF Solar per-country directories, aggregate | 300–800 |
| Ghana alphabetical installer PDF | 75–100 |
| Côte d'Ivoire APERCI/FIACER | ~105 |
| Senegal annuaire + COPERES | 130–330 |
| Nigeria NERC (170 permits in 2024 alone vs ~30 extracted) | 150+ |
| 16 zero-coverage + 14 token countries | 200–400 |

**Roughly 2,500–4,000 identifiable organisations remain unfound.** The sweep captured on the order of a quarter to a third of the addressable population, and did so unevenly — one country (ZA) is 38% of the output.

Also unmeasured: the repo already stages a **user-supplied 1,953-row organisations workbook** (`data/intake/organisations/phase2-directory-2026-08-03/`). Only 260 of those rows are checkable in-repo, and against those the sweep collides on 7 names. Nobody knows the real overlap. It is entirely possible several hundred of these 1,124 are already staged.

**Single highest-yield next action: one human-operated browser session against six URLs.** EPRA's two registers, ZERA's 43-page PDF, the Ghana EC alphabetical PDF, `annuairehorsreseau.gouv.sn`, and ENF's per-country installer pages. Expected yield 1,000–1,700 organisations from regulator-grade sources — more than this entire sweep produced, in a couple of hours, with better provenance than the association directories that carried it.

**Do this first, because it is free:** the Uganda pass parsed ERA's live register of 4,515 permits and holds **231 distinct company-class permit holders** — regulator-verified, with permit number, location and phone. It shipped **22**. The other ~209 were thrown away for failing a self-imposed rule requiring a second corroborating source (USEA membership). A national regulator's own register is stronger evidence than the association directory it was being validated against. The parsed rows are still on disk at `/tmp/claude-0/-home-user-africa-energy-software-map/bfd2e634-c531-59c5-ab5c-0f6defae34b1/scratchpad/era_rows.json` (filter field 4 for `X`/`XM`/`XH`/`XS`). Recovering them costs nothing and nearly doubles Uganda-plus-Tanzania in one step. Then fix the rule before the next sweep, or the same loss will repeat everywhere a register is finally opened.