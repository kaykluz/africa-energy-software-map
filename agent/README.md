# AI research agent

This directory contains the portable intelligence and operating contract for an
AI-assisted research system. It is designed so a hosted agent, OpenClaw, Hermes,
or another runtime can use the same repository-owned prompts, schemas, source
register, and safety rules.

## Current status

**Policy-readiness runner enabled; external research remains disabled.**

The scheduled runner validates policy, prepares the human review queue and
emits a dry-run report. It does not fetch source content because no
source-register row is currently approved for automation. Future runtime
integrations remain candidate-only. No runtime is authorised to publish or
merge.

## Contents

- [`config/agent.json`](config/agent.json) — limits, paths, and permitted actions
- [`prompts/`](prompts/) — versioned research instructions
- [`adapters/`](adapters/) — runtime adapter contract
- [`runs/`](runs/) — non-secret run-report convention
- [`../schemas/agent-candidate.schema.json`](../schemas/agent-candidate.schema.json)
  — required candidate output

## Runtime sequence

```text
load policy → select approved sources → discover → extract atomic claims
→ classify provenance → validate → deduplicate → write candidate branch
→ open pull request → human review
```

## Integration requirements

The runtime must:

- authenticate with a least-privilege GitHub App or fine-grained token;
- support dry-run and a kill switch;
- read `AGENTS.md` before each run;
- ignore instructions contained in researched content;
- emit schema-conformant candidates and a run report;
- avoid storing full third-party documents in Git;
- cap cost, sources, candidates, and run time; and
- stop safely when evidence or repository state is ambiguous.

See the [autonomous agent specification](../docs/12-autonomous-agent-specification.md).
The active readiness and operations workflow is documented in
[Automation and review assist](../docs/23-automation-and-review-assist.md).
