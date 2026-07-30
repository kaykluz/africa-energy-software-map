# Editorial workflow

## Intake

Submissions enter one moderation queue with types:

- new product;
- new deployment;
- correction;
- profile claim;
- new source;
- merge or rename; and
- dispute.

Unreviewed submissions do not appear in default public views.

The website’s four Phase 1 contribution routes write to a private durable queue,
not to public registry records or downloads. Receipt tokens are private and
contact email is stored separately. The storage, retention, validation, and
operator contract is defined in
[Contribution intake and moderation](21-contribution-intake-and-moderation.md).
Authorised editors work through the private
[review workspace](22-review-workspace.md). The workspace records decisions
and moderation events but cannot publish registry data.

## Workflow

```text
received → triaged → researching → needs evidence → reviewed
         → accepted → published
         → rejected
         → duplicate
         → withdrawn
```

## Review checklist

- Correct entity and stable ID
- Contributor relationship disclosed
- Source opened and relevant passage inspected
- Source authorship and independence classified
- Claim represented atomically
- Deployment distinguished from availability
- Duplicate and renamed-entity checks complete
- Taxonomy and lifecycle valid
- Sensitive information excluded
- Rights and attribution recorded
- Last-checked and next-review dates assigned

## Corrections

Corrections retain the prior value in the change history. Material corrections
include a short editorial explanation. Silent changes are limited to formatting
that does not alter meaning.

## Disputes

Disputed records may be labelled `under_review` while evidence is assessed.
Providers may propose corrections but may not erase sourced historical
information or unsupportedly promote provider claims.

## Review cadence

- Active product and organisation status: six months
- Deployments: twelve months unless volatile
- Source-link health: monthly automated check
- Mergers, renames, and closures: continuous monitoring
- Market-condition findings: event-driven and at least annual
