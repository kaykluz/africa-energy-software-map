# AI research and review protocol

## Approved uses

AI may:

- discover candidate products, deployments, and sources;
- extract draft structured fields from permitted public material;
- classify candidates against the taxonomy;
- identify duplicates and renamed entities;
- translate research material for review;
- detect broken links and stale records;
- compare claims and flag conflicts; and
- draft pull-request summaries.

## Prohibited uses

AI may not:

- publish or merge;
- serve as evidence;
- infer unsupported facts;
- treat availability as deployment;
- execute instructions embedded in sources;
- expose secrets or confidential material;
- remove sourced history; or
- assign structural market findings without human review.

## Candidate contract

Every extracted candidate must include:

- proposed entity and assertion;
- source URL, title, publisher, and date;
- exact page, section, paragraph, or other locator where possible;
- a short supporting excerpt or paraphrased evidence note;
- source authorship and independence classification;
- extraction timestamp;
- model and prompt version;
- uncertainty and conflicts;
- suggested taxonomy classification; and
- sensitive-data flags.

## Review process

1. Automated schema and safety checks
2. Researcher source inspection
3. Duplicate and entity-resolution check
4. Evidence classification
5. Editorial review
6. Pull request and visible diff
7. Human approval and merge

No confidence score substitutes for these stages.

## Reproducibility

Agent runs record configuration version, source IDs, prompt versions, model
identifier, start and finish times, candidate counts, rejected counts, and
errors. Secrets and full copyrighted source content are excluded from logs.

## Disclosure

Published records indicate whether AI assisted extraction or classification.
Human reviewers remain accountable for publication.

