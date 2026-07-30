# Workbook imports

This directory contains candidate-only migrations from structured source files.
Nothing here is part of a public data release until it has completed editorial,
rights, privacy, and safety review and has been promoted into an immutable
release.

Import packages must:

- identify the external source file by checksum without committing it;
- list excluded sheets and fields;
- exclude personal contact data and non-Phase-1 people records;
- preserve legacy identifiers through an explicit mapping;
- attach sources to atomic assertions;
- downgrade provider-authored deployment claims;
- separate multi-country availability from country deployments;
- record every lossy or heuristic transformation;
- split review batches below the limits in `AGENTS.md`; and
- pass repository validation.

Generated files are reproducible from the external source file and the checked-in
mapping configuration. The source workbook itself must not be committed unless a
separate rights and privacy review explicitly approves it.
