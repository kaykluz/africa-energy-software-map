# Runtime adapter contract

An adapter connects a runtime to the repository-owned agent specification.

## Inputs

- `AGENTS.md`
- `agent/config/agent.json`
- approved source-register rows
- taxonomy and schemas
- selected versioned prompts
- optional issue or manual research brief

## Outputs

- one JSON candidate file per proposed assertion group;
- one run report conforming to `schemas/run-report.schema.json`;
- a branch with no more than the configured change limit; and
- a pull request with the required labels.

## Required controls

- dry-run mode;
- kill switch;
- timeout and cost ceiling;
- allowlisted network destinations or source IDs;
- secret redaction;
- prompt-injection isolation;
- idempotent run ID;
- retry limit;
- no default-branch write; and
- human-review gate.

Runtime-specific adapters should live in their own subdirectories and document
credentials, deployment, rollback, and limitations without committing secrets.

