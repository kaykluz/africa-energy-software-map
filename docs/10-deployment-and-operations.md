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

The canonical database, source register, release artefacts, and moderation
history require automated backups. Published snapshots remain reproducible from
the repository and release archive.

## Observability

Monitor failed source checks, agent errors, moderation backlog, stale records,
schema failures, data-release failures, and public application availability.

