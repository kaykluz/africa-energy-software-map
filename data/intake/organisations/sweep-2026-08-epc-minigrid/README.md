# Agent web sweep — EPCs, installers and mini-grid developers, 27 August 2026

This directory stages an **agent web sweep** as bounded, candidate-only review
batches. It does not authorise publication. See
`docs/33-agent-web-sweep-intake.md` for the protocol and
`data/research-queue/sweep-2026-08-epc-minigrid/` for the reject and flag
reports.

## Why this sweep ran

The published catalogue held 2,265 organisations and **71 with an EPC role**, 20
of them with no country. Nigeria had 213 organisations and one EPC; Uganda 181
and one. Ethiopia, Zambia, Senegal, Côte d'Ivoire, Rwanda, Mozambique, Zimbabwe
and Morocco had none. The engineering and installation side of the market was
effectively absent.

## What arrived

Eleven research agents swept ten markets plus a pan-African mini-grid pass,
reading 395 sources. **1,507 rows** came back; **1292** are staged here across
52 batches, covering **29 countries**.

| Country | Candidates |
| --- | --- |
| ZA | 470 |
| UG | 237 |
| EG | 100 |
| NG | 87 |
| TN | 87 |
| MA | 80 |
| GH | 35 |
| SN | 23 |
| KE | 19 |
| ET | 17 |
| GN | 16 |
| ZW | 15 |

| Suggested role | Rows |
| --- | --- |
| `org_role_installer` | 993 |
| `org_role_epc` | 251 |
| `org_role_developer_ipp` | 166 |
| `org_role_om_asset_manager` | 119 |
| `org_role_distributor` | 84 |
| `org_role_to_classify` | 73 |
| `org_role_system_integrator` | 37 |
| `org_role_energy_service_company` | 34 |
| `org_role_equipment_supplier` | 34 |

## What was dropped, and why

205 rows did not reach a batch:

| Reason | Rows |
| --- | --- |
| already in the published catalogue | 203 |
| confirmed natural person, not a business | 2 |

A further **65 rows are flagged as possible natural persons** and are
KEPT in the batches, listed in `flagged-personal.json`. An editor should judge
them against the source before accepting. Two names confirmed as individuals
were dropped outright.

## Provenance and limits

`source.kind` is `agent_web_sweep`, not `user_supplied_inventory`. A workbook
mis-transcribes; a sweep can fabricate. Read these rows more sceptically than
workbook rows and open the source before accepting.

Known limits, from the sweep's own coverage audit:

- **Kenya is the headline failure.** The EPRA contractor register — the
  strongest evidence available for the continent's deepest solar market — was
  unreachable from the sweep environment. Kenya has 51 rows where it should
  have several hundred.
- Zimbabwe's ZERA register, Ghana's alphabetical installer PDF, Senegal's
  `annuairehorsreseau.gouv.sn` and ENF Solar's per-country directories were all
  blocked or dead. The audit estimates **2,500–4,000 identifiable organisations
  remain unfound**, and that one human-operated browser session against six
  named URLs would yield more than this entire sweep.
- **Only 14% of rows carry a website.** Name-only rows are hard to reconcile
  and will carry a real manual-review load.
- Segment coverage is thin outside solar PV: clean cooking, efficiency, storage
  and e-mobility are effectively unsampled.
- Overlap with the staged 1,953-row workbook in
  `phase2-directory-2026-08-03/` is unmeasured. Some of these may already be
  staged there.

## Uganda

237 of these rows are Ugandan because the ERA register of certified
installation permit holders was parsed in full: 4,515 permits, of which the
**240 company-class rows (X/XM/XH/XS) yield 231 distinct companies**. Classes
A, B, C, D and Z are individual electricians and are excluded — publishing them
would put roughly 4,275 people's names into a company directory. Permit
numbers and locations are carried as evidence; the register's phone-number
column is not.
