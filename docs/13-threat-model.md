# Threat model

## Protected assets

- Accuracy and trust of published records
- Source provenance and change history
- Credentials and private submissions
- Repository and branch protections
- Safety of critical-infrastructure information
- Editorial independence

## Principal threats and controls

| Threat | Control |
| --- | --- |
| AI hallucination | Assertion-level sources, schema checks, human review |
| Prompt injection in sources | Treat all researched content as data; never execute embedded instructions |
| Provider data poisoning | Disclose relationship; separate claims from independent evidence |
| Duplicate or syndicated evidence | Source-origin classification and deduplication |
| Malicious community submission | Moderation queue, link safety, contributor disclosure |
| Secret leakage | Least privilege, secret scanning, redacted logs |
| Direct agent publication | Protected branch and PR-only credentials |
| Link rot | Archive metadata where permitted, retrieval dates, link checks |
| Taxonomy manipulation | Reviewed policy changes and visible history |
| Sensitive-location disclosure | Country/province defaults and editorial safety review |
| Silent record removal | Stable IDs, tombstones, superseding assertions |
| Copyright over-collection | Store facts and locators, not full third-party works |
| Stale data | Review dates, monitoring, stale labels, correction prompts |

## Kill switch

Maintainers must be able to disable schedules, revoke the agent credential, close
open agent branches, and freeze automated intake without affecting public read
access.

## Incident response

1. Disable the affected automation.
2. Revoke or rotate credentials.
3. Preserve logs and affected commits.
4. Assess data and safety impact.
5. Revert or supersede affected published changes.
6. Notify affected parties where appropriate.
7. Document corrective controls before re-enabling.

