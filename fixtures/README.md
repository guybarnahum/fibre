# Fixtures

All records here are synthetic test data. They are not live Threads and do not represent real people. Production data must remain outside Git.

Fixtures are organized by **what the data is**, not by the milestone that first needed it.

- `threads/` — complete synthetic Thread snapshots suitable for seeding/rehydration tests.
- `genesis/` — reusable pre-birth inputs such as World specifications, lineage/genome material, and Genesis scenarios/cohorts.
- `birth-center/` — durable development-workflow fixtures such as restart/recovery journals and recorded provider results.
- `thread-presentation/` — derived presentation examples. Presentation fixtures are non-authoritative and may not become hidden Genesis input or semantic evidence about a Thread.

A fixture tied to a burned experiment or milestone cohort may retain that milestone name while the cohort is still intentionally frozen. Do not rename frozen evidence to make it look generic. If part of such a cohort later becomes a reusable product fixture, create a semantically named reusable fixture from the useful concept and retire the milestone-specific cohort when its replay value ends.

Version identifiers belong in fixture data when they identify a real serialized contract. They should not be added to paths merely to record that a fixture was the first implementation.
