# Data releases

The first reviewed package is
[`0.1.0/batch-001`](0.1.0/batch-001/README.md). It contains the 88
human-reviewed assertions and nine resolved source records that drive the
current interface snapshot. It is prepared for independent pull-request
approval; generation alone does not authorise publication.

The older files under `web/public/downloads/prototype-0.1/` remain a historical
candidate interface package, not a formal release.
Each release must include:

- normalised tables;
- a schema and data dictionary;
- version and release date;
- licence and attribution guidance;
- change log;
- checksums; and
- known coverage and quality limitations.

Release archives are immutable. Corrections appear in later versions.

The release generator refuses published mode while assertion review or source
metadata is incomplete. See
[`../../docs/19-snapshot-and-export-pipeline.md`](../../docs/19-snapshot-and-export-pipeline.md).
