# PR #39 closing hostile review request

Review the current #39 closing plan against Fibre's personhood vision and the original #39 semantic obligations.

## Meaning of hostile

"Hostile" here does **not** mean cyber-security review. It means adversarial review of whether the implementation and closing plan genuinely advance Fibre toward persistent, particular artificial persons without laundering authority, overfitting evidence, confusing representations, or claiming capabilities that belong to later milestones.

## Read first

1. `docs/state/pr39-closing-plan.md`
2. `docs/decisions/ADR-0015-fibre-centric-development.md`
3. `docs/decisions/ADR-0014-repository-retention.md`
4. `docs/validation/m2-pr39-implementation-plan.md` — original semantic/slice plan
5. `docs/validation/m2-pr-plan.md` — M2 boundary and #39/#40/#41 responsibilities
6. `docs/foundations/interpretive-personhood.md`
7. `docs/foundations/rich-life.md`
8. `docs/decisions/ADR-0013-source-identity-consent-boundary.md`

Inspect current implementation as needed, especially:

- `fixtures/genesis/pr39/development-cohort-v1.json`
- `tools/genesis/genesis-life-plan.mjs`
- `tools/genesis/genesis-pr39-dev.mjs`
- `tools/genesis/genesis-pr39-dev-check.mjs`
- `tools/genesis/genesis-replacement-candidate.mjs` (still awaiting naming/currentization cleanup)
- current Pass A/B/C and birth/publication implementation under `services/world-kernel` and `services/birth-center`

## Context

#39 development accumulated R1/R2/G/H frozen protocols, preflight authority witnesses, prompt/config hash tests, one-shot guards and parallel replacement paths. They were useful for specific investigations but became a development objective of their own.

The current cleanup deliberately changes process:

- current inputs move from `artifacts/validation` into normal fixtures;
- ordinary development uses current code plus disposable `.fibre/` runs;
- active tests protect semantic invariants rather than historical review states;
- the five existing Tbilisi/Kaohsiung/Recife/Fès/Hobart Worlds are now explicitly development material and are burned for the final held-out cohort;
- the final cohort remains fresh and one-pass/no-quality-regeneration because that is a substantive scientific safeguard;
- one adversarial closing review replaces repeated gate choreography.

Current creative sampling policy is temperature 0.3 for Pass A/B/C and fresh record retries, with temperature 0 for mechanical observable-action form repair. Fibre still deterministically owns time, place, EventStructure, counterpart, chronology and admission authority.

The closing audit also identified real remaining work rather than declaring victory:

- origin/source integrity for Thread-parent, Echo, Homage and fork;
- living-human Echo consent and Homage deceased/fictional enforcement;
- source biography may never become Thread autobiography;
- `observableAction` narrative location must remain consistent with authoritative `placeRef` before publication;
- actual memory-photo obligation must be verified on the birth bundle;
- one current D1-D5 diagnostic/restart path must replace old freeze scripts;
- five fresh final Worlds must be authored only after the compiler is stable.

## Questions to attack

1. **Semantic loss:** Did the simplified closing plan accidentally drop any substantive A-H or 19-item completion requirement from the original plan?
2. **False closure:** What could make #39 appear complete while the resulting Threads are still interchangeable backstories rather than particular lives?
3. **Held-out validity:** Is using tuned development Worlds followed by five fresh one-pass final Worlds sufficient to preserve the original anti-overfitting intent without the old freeze protocol?
4. **Model sampling:** Does temperature 0.3 for creative cognition and 0 for mechanical repair preserve Fibre authority while allowing contingent life realization? Identify any authority leak this introduces.
5. **Genome boundary:** Can genome influence still leak backward into Pass A or directly author Pass C meaning? Are the current controls enough for the final cohort?
6. **Source integrity:** Are the closing plan's identified Slice-F blockers complete? What exact production invariants are required for Thread-parent, Echo, Homage and fork?
7. **Birth authority:** What could still allow Genesis to create a parallel biography/memory authority or publish a half-born Thread?
8. **History/memory/meaning:** Is the current separation merely representational, or does any path silently make remembered interpretation authoritative history?
9. **Diagnostics:** Do D1-D5 remain meaningful measurements under the lean closing approach, or has any simplification made success inevitable?
10. **Repository cleanup:** Which old R1/R2/G/H files contain a semantic safeguard that must first be transferred into current code/tests before deletion? Which are pure process archaeology and should disappear from `HEAD`?
11. **Milestone boundary:** Is any closing requirement actually #40 causal consumption or #41 standing and therefore incorrectly being pulled into #39?
12. **Missing blocker:** Name anything not listed above that should stop #39 from closing.

## Required response

Start with exactly one verdict:

`VERDICT: CLEAR`

or

`VERDICT: HOLD`

Then provide:

- **Blockers** — only defects that could make the #39 Fibre claim false or scientifically invalid;
- **Non-blocking improvements** — valuable but not required for #39 closure;
- **Deletion cautions** — old files/mechanisms whose semantics must be preserved before cleanup;
- **Smallest closing sequence** — the shortest correct route from the current branch to #39 closure.

Do not reward complexity, number of artifacts, review ceremony or frozen hashes. Judge whether Fibre can honestly birth five particular prior lives with correct authority/provenance boundaries and then hand them to #40.
