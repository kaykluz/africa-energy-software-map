# Africa Energy Software Map web prototype

Responsive Phase 1 interface for the public registry. Its version 2 direction
combines a visual Explore mode, an interactive Map and a precise Data workspace,
with detail revealed progressively through search, previews and full records.

The implementation contract is
[`docs/17-visual-interaction-redesign.md`](../docs/17-visual-interaction-redesign.md).

The interface currently renders the first workbook migration batch as
**candidate prototype data**. It does not publish or verify those records.

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
the Stack, Directory, a product profile and the methodology AI disclosure.

## Product principles

- evidence wording stays visible where claims appear;
- provider claims never become evidenced deployments;
- Stack, Deployments and Directory use one filter vocabulary;
- exports state the visible record set and prototype status;
- country views avoid precise non-public infrastructure coordinates;
- browsing, search, export and correction require no account; and
- no autonomous process can publish without human editorial review.
