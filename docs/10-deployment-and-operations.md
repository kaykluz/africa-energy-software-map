# Deployment and operations

## Branches

- `main` is protected and releasable.
- Human and agent changes use short-lived branches.
- Data, schema, and policy changes require pull requests.
- Automated agents cannot bypass review.

## Environments

- Local development
- Preview per pull request
- Production public site
- Separate research runner

The research runner receives no production write credential. It writes branches
and pull requests only.

Community contributions use the website’s private D1 binding. That binding does
not give the research runner or public-data build a path around the editorial
release gate.

The private review workspace uses the same binding for isolated review and
audit tables. Access requires ChatGPT authentication plus the explicit
`REVIEWER_EMAILS` environment allowlist. The allowlist fails closed and must be
configured independently in every deployed environment. See
[Review workspace](22-review-workspace.md).

## Continuous integration

Required checks will include:

- repository and data validation;
- schema compatibility;
- duplicate stable IDs;
- broken internal links;
- secret scanning;
- application tests when implementation begins; and
- accessibility and performance checks for the public site.

## Releases

Code and data releases are independently versioned. Every data release includes
checksums, schema, licence, change log, and archived snapshot.

## Backups and recovery

The canonical database, source register, release artefacts, moderation history,
and private contribution queue require automated backups. Contact data must keep
its shorter retention schedule in backups as well as the live database.
Published snapshots remain reproducible from the repository and release archive.

## Observability

Monitor failed source checks, agent errors, moderation backlog, stale records,
schema failures, data-release failures, and public application availability.

The scheduled Safe automation workflow now runs retention maintenance and a
weekly proposal-only research and scale-readiness pass. Its deployment,
credential and failure rules are defined in
[Automation and review assist](23-automation-and-review-assist.md).
