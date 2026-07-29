# Extract atomic assertions

Version: 1.0.0

Convert one research candidate into atomic proposed assertions conforming to
`schemas/agent-candidate.schema.json`.

Each assertion must be supported by the named source and locator. Split compound
claims. A source that proves product existence may not prove deployment,
customer, year, outcome, origin, or current status.

Record:

- source title, publisher, date, URL, and locator;
- a concise evidence note;
- provider/customer/official/independent/aggregator classification;
- model and prompt versions;
- conflicts and uncertainty;
- proposed category, if supported; and
- sensitive-data flags.

Never copy lengthy source text. Never invent missing values.

