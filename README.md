# Africa Energy Software Map

An open, evidence-backed map of the software powering African energy systems.

The project will document what each product does, who built it, where it is
deployed, and the evidence behind every published claim. It is designed as a
living public record rather than a logo wall or a conventional startup
directory.

## Project status

**Foundation and interactive-prototype phase.** The information architecture,
taxonomy, evidence policy, data model, contribution workflow, export contract,
autonomous-research guardrails, and first responsive application are under
review.

No dataset in this repository should yet be treated as a complete census.

## Product experience

One database supports three connected public modes:

1. **Explore** — a visual route through software across the energy value chain.
2. **Map** — where products are evidenced as being used, rather than
   merely where their providers are headquartered.
3. **Data** — searchable, filterable, and exportable records for academics and
   power users.

Every material deployment and market claim will link to evidence and display a
last-checked date.

The initial research workbook is entering through a candidate-only,
privacy-filtered migration. See the
[workbook migration protocol](docs/16-workbook-migration-protocol.md). Imported
records do not become public or verified without human editorial review.
The prototype website and its candidate downloads are generated from one
checksum-verified batch. The
[snapshot and export pipeline](docs/19-snapshot-and-export-pipeline.md)
documents the promotion gate and update workflow.

## Core principles

- Product-level records, not company logos.
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
| [`web/`](web/) | Responsive Phase 1 interactive prototype and route tests |
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
- [Snapshot and export pipeline](docs/19-snapshot-and-export-pipeline.md)
- [Interactive prototype](web/README.md)
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
