# Reviewed release shards

This directory holds immutable, human-reviewed deltas prepared from the private
review workspace. Each shard is limited to 25 entities and 100 assertions so it
can receive independent editorial review in a focused pull request.

A shard contains only public factual metadata, assertion-level source links,
resolved source-rights metadata and a repository-safe reviewer label. Private
review packages, reviewer contact details and audit-session data are never
committed.

Shards do not publish themselves. After every shard in a batch is independently
approved, the release pipeline composes them with the current reviewed baseline,
validates cross-shard references and produces the next versioned public snapshot.
