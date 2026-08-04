# Africa Energy Software Map

An open, evidence-backed map of the software powering African energy systems.

The project documents what each product does, who built it, where it is
deployed, and the evidence behind every published claim. It is designed as a
living public record whose visual walls always lead to sourced, dated records.

## Project status

**Reviewed-beta phase.** The information architecture, taxonomy, evidence
policy, data model, contribution workflow, export contract, autonomous-research
guardrails and responsive application are implemented. Batch 001 is the first
human-reviewed data release and was merged through independent pull-request
review.

No dataset in this repository should yet be treated as a complete census.

## Product experience

One connected data model supports five public modes:

1. **Explore** — the complete classified catalogue.
2. **Map** — where products are evidenced as being used, rather than
   merely where their providers are headquartered.
3. **Data** — searchable, filterable, and exportable reviewed software records
   for academics and
   power users.
4. **Wall** — a visual software landscape organised by relationship to energy,
   function, software stage and sector.
5. **Organisations** — actor types such as financiers, developers, OEMs, EPCs,
   operators, software providers and enablers. The route separates a broad
   1,953-record inclusion catalogue from canonical reviewed profiles and is
   filterable by role, energy market, headquarters, country and review status.

Every material deployment and market claim will link to evidence and display a
last-checked date.

The initial research workbook entered through a candidate-only,
privacy-filtered migration. See the
[workbook migration protocol](docs/16-workbook-migration-protocol.md). Imported
records do not become public or verified without human editorial review.
The first source pass is documented in the
[Batch 001 evidence review](docs/20-batch-001-evidence-review.md).
The website and its reviewed downloads are generated from one
checksum-verified release. The
[snapshot and export pipeline](docs/19-snapshot-and-export-pipeline.md)
documents the promotion gate and update workflow.
Completed public contributions now enter a durable private intake queue and
receive a private status link. They remain separate from the registry until a
human-reviewed data change passes the publication gate. See
[contribution intake and moderation](docs/21-contribution-intake-and-moderation.md).
Authorised editors can now review candidate assertions, source rights, and
incoming contributions in a private
[`/review` workspace](docs/22-review-workspace.md). Its decisions are audited.
Organisation-catalogue Accept or Amend decisions materialise live canonical
profiles directly; assertion, source, contribution and bulk decisions do not.
Bulk candidates can be accepted, amended, rejected or held for more evidence.
Approved rows become source-linked atomic assertions in that same private
workspace and still require assertion-level review before a release pull
request can be prepared.
The same workspace now exposes every organisation-catalogue row in a dedicated
queue. Organisation decisions are versioned and audited. Accept or Amend updates
the live canonical registry immediately, while a bounded, independently reviewed
data pull request is still required for an immutable GitHub release snapshot.
Scheduled retention, source-first review preparation, proposal-only research
readiness, and the bounded Batch 002 plan are documented in
[automation and review assist](docs/23-automation-and-review-assist.md).

## Core principles

- Product-level records remain primary; product or owner logos are visual
  navigation aids, never substitutes for records.
- Deployment geography is distinct from headquarters and claimed availability.
- Anyone may submit; editors decide what is published.
- AI may discover and structure claims, but it may not verify or publish them.
- Evidence attaches to individual assertions.
- Provider claims are visibly distinct from independent evidence.
- Historical, acquired, renamed, and inactive products remain in the record.
- No paid ranking, paid verification, or paid inclusion.
- No publication of sensitive critical-infrastructure information.
- Public data is exportable in open, documented formats.

## Repository map

| Path | Purpose |
| --- | --- |
| [`docs/`](docs/) | Product, data, editorial, design, and operating specifications |
| [`data/`](data/) | Taxonomy, candidate imports, release conventions, and future data |
| [`schemas/`](schemas/) | Machine-readable table and agent-output contracts |
| [`agent/`](agent/) | AI research prompts, policy, configuration, and adapter contract |
| [`scripts/`](scripts/) | Repository and data validation |
| [`web/`](web/) | Responsive public application, review workspace and route tests |
| [`.github/`](.github/) | Contribution templates, ownership, and automated checks |

## Start here

- [Documentation index](docs/README.md)
- [Product charter](docs/00-product-charter.md)
- [Information architecture](docs/01-information-architecture.md)
- [Data model and taxonomy](docs/02-data-model-and-taxonomy.md)
- [Evidence and verification policy](docs/04-evidence-and-verification-policy.md)
- [AI research and review protocol](docs/06-ai-research-and-review-protocol.md)
- [Autonomous agent specification](docs/12-autonomous-agent-specification.md)
- [Workbook migration protocol](docs/16-workbook-migration-protocol.md)
- [Visual interaction redesign](docs/17-visual-interaction-redesign.md)
- [Expansion architecture and roadmap](docs/18-expansion-architecture-and-roadmap.md)
- [Snapshot and export pipeline](docs/19-snapshot-and-export-pipeline.md)
- [Batch 001 evidence review](docs/20-batch-001-evidence-review.md)
- [Contribution intake and moderation](docs/21-contribution-intake-and-moderation.md)
- [Private review workspace](docs/22-review-workspace.md)
- [Automation and review assist](docs/23-automation-and-review-assist.md)
- [Sector, geography and bulk intake](docs/24-sector-geography-and-bulk-intake.md)
- [Production backend, admin and custom domain](docs/25-production-backend-admin-and-domain.md)
- [Public web application](web/README.md)
- [Contributing](CONTRIBUTING.md)

## Contributing

Use the GitHub issue forms to suggest a solution, deployment, source, or
correction. Pull requests are welcome for documentation, schemas, tooling, and
well-sourced data changes.

All published data changes must satisfy the evidence and editorial policies.
Automated agents must follow [`AGENTS.md`](AGENTS.md) and may only propose
changes through pull requests.

## Licensing

- Code: [MIT License](LICENSE)
- Original documentation and project-created dataset: [CC BY 4.0](DATA-LICENSE.md)
- Third-party source material remains subject to its original rights and is not
  relicensed by this repository.
