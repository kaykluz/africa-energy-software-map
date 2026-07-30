# Africa Energy Software Map web prototype

Responsive Phase 1 interface for the public registry. Its version 2 direction
combines a visual Explore mode, an interactive Map and a precise Data workspace,
with detail revealed progressively through search, previews and full records.

The implementation contract is
[`docs/17-visual-interaction-redesign.md`](../docs/17-visual-interaction-redesign.md).
Growth and data-boundary rules are in
[`docs/18-expansion-architecture-and-roadmap.md`](../docs/18-expansion-architecture-and-roadmap.md).

The interface currently renders the first workbook migration batch as
**candidate prototype data**. It does not publish or verify those records.
Products, organisations, deployments and downloads are generated together from
one checksum-verified batch; they are not duplicated in UI components. See the
[snapshot and export pipeline](../docs/19-snapshot-and-export-pipeline.md).

## Run locally

```bash
npm ci
npm run dev
```

## Validate

```bash
npm run lint
npm test
```

`npm test` builds the production worker and checks server-rendered content for
the Stack, Directory, Data, product and country profiles, search, and the
methodology AI disclosure.

To regenerate or verify the interface data before running the web checks:

```bash
python3 scripts/build_registry_snapshot.py
python3 scripts/build_registry_snapshot.py --check
```

## Product principles

- evidence wording stays visible where claims appear;
- provider claims never become evidenced deployments;
- Stack, Deployments and Directory use one filter vocabulary;
- category and country previews stay bounded as the registry grows;
- the Directory pages the full filtered set at 25, 50 or 100 rows;
- exports state the visible record set and prototype status;
- country views avoid precise non-public infrastructure coordinates;
- browsing, search, export and correction require no account; and
- no autonomous process can publish without human editorial review.
