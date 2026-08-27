# Agent web-sweep intake

Status: tooling implemented; first sweep pending review
Last updated: 26 August 2026

## Why a third intake path

The registry already has two ways in: the public contribution form, and the
user-supplied workbook staged through `prepare_organisation_inventory.py`. Both
begin with a human writing a name down.

Role coverage exposed the limit of that. On 26 August 2026 the published
catalogue held 2,265 organisations but only **71 with an EPC role**, of which 20
carried no country at all. Nigeria held 213 organisations and one EPC; Uganda
181 and one. Ethiopia, Zambia, Senegal, Côte d'Ivoire, Rwanda, Mozambique,
Zimbabwe and Morocco held none. The engineering and installation side of the
market was effectively absent, and no workbook was going to arrive and fix it.

This document covers the third path: research agents sweeping named public
sources, and the deterministic pipeline that decides what a reviewer ever sees.

## The failure mode this path introduces

A workbook mis-transcribes. A sweep **fabricates**. A language model asked for
"solar installers in Nigeria" will happily produce twenty plausible company
names, a majority of them real, the rest invented — and the invented ones look
exactly like the real ones. Publishing those would do more damage to this
project than the missing coverage does, because the registry's only asset is
that a listed record can be traced to a source.

Two defences, and neither is discretionary.

**Agents may not draw on memory.** Every returned company must appear by name on
a page the agent opened during the task, and must cite that page. The brief
states plainly that returning fewer companies is correct when sources are thin,
that an empty result with honest notes is a good outcome, and that padding the
list is the worst one. Sources that fail — PDF-only licence registers, paywalled
directories, dead links — are recorded as unusable rather than silently skipped,
because knowing where a human must look manually is itself a result.

**The assembler trusts nothing.** `prepare_sweep_candidates.py` filters what
comes back through three gates in order:

| Gate | Drops |
| --- | --- |
| Shape | Rows with no name, no source URL, no ISO2 country, or a role/segment id outside `taxonomy.json` |
| Reconciliation | Names already in the published catalogue; duplicates within the sweep are merged, not repeated |
| Liveness | Rows whose `sourceUrl` does not resolve; a claimed website that does not resolve is stripped rather than published |

The liveness gate is the one that matters. A fabricated company usually announces
itself as a domain that has never existed, so every URL is resolved over the
network before a reviewer sees it. Any HTTP status counts as existing — a 403 or
404 still proves the host is real. Only DNS failure, refusal or timeout count as
absent.

## Natural persons must never enter the catalogue

Installer registers are the richest source of EPC coverage and the most
dangerous. South Africa's PV GreenCard and Uganda's ERA permit register both
certify **people**, not only firms — the ERA register alone holds 4,515
permits. A personal name in an organisation catalogue is a privacy breach, and
the liveness gate cannot catch it: a sole trader with no website is
indistinguishable from a company with no website.

The gate therefore **flags rather than drops**, and the reason is empirical.
Run against the first sweep it flagged 31 of 724 rows. About thirty were plainly
businesses whose form the heuristic did not recognise — Afrikaans trading terms
(`Elektries`, `Sonkrag`, `Konsult`) and ordinary names carrying no legal suffix
(`Dorper Wind Farm`, `BURN MANUFACTURING`, `Kitso Design Institute`). Two were
genuine natural persons. An auto-drop would have deleted thirty real companies
to remove one person.

So the machine narrows the field and a human decides:

- names confirmed by review as natural persons sit in
  `PERSONAL_NAMES_CONFIRMED` in the script, one commented line each, and are
  dropped outright;
- everything else the heuristic flags is **kept** and written to
  `flagged-personal.json` beside the batch, for an editor to judge against the
  source page.

Add to the confirmed list only after opening the source. The list is code, so
the decision is reviewable and can be challenged like any other.

## Provenance must stay visible

`organisation-candidate.schema.json` previously pinned `source.kind` to
`user_supplied_inventory`. A sweep batch labelled that way would tell a reviewer
a human had supplied it. The enum now also accepts `agent_web_sweep`, and sweep
batches use it. The distinction is not bookkeeping: the two paths fail
differently, and a reviewer should read a sweep row more sceptically than a
workbook row.

Existing workbook batches are unaffected and continue to validate.

## Source preference

In descending order of evidential weight:

1. **Regulator licence and registration lists** — a national authority naming a
   licensed contractor is the strongest evidence available.
2. **Industry association member directories** — membership is self-selected but
   verifiable and attributable.
3. **Programme and tender award lists** — electrification agencies and donors
   naming an awarded contractor.
4. **Project and partnership announcements** — weakest, and only where the
   contractor is named.

Search in the language of the market. Most West African and North African
sources are French or Arabic, and an English-only sweep will under-report them
while appearing to have covered the country.

## What the path does not do

It does not publish. Batches are written `candidateOnly`, with
`publicationAuthorised: false` and `humanReviewRequired: true`, every row
`needs_source_review`, capped at 25 rows per file exactly as workbook intake is.
They enter `/review` like any other candidate and an editor opens the source
before accepting.

A sweep is a way of finding things worth reviewing. It is not a way of deciding
what is true.

## Running one

```bash
python3 scripts/prepare_sweep_candidates.py \
    --sweep artifacts/sweep-results.json \
    --batch-dir data/intake/organisations/sweep-2026-08-epc-minigrid \
    --as-of 2026-08-26
```

`--skip-liveness` exists for offline dry runs of the shaping logic. It must
never produce a batch a reviewer will see: it disables the fabrication gate.

Rejected rows are written to `rejected.json` beside the batches, with the reason
each was dropped. That file is the sweep's own audit trail — a high rejection
rate is a signal about the sweep, not noise to discard.
