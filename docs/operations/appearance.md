---
id: appearance-operations
status: accepted
last-reviewed: 2026-09-28
---

# Appearance operations

Fibre appearance maintenance has four operator actions. They are deliberately distinct because they change different authorities.

## Diagnose

Always start here:

```bash
npm run appearance:diagnose -- --thread-id=thr_...
```

Diagnosis reports:

- the physical-genome version stored in World;
- the current required physical-genome version;
- whether appearance migration is available;
- reusable operator-confirmed parental physical-origin evidence, when present;
- whether the canonical visual specification is owned by the current Embodiment;
- the current canonical root.

Typical states are:

```text
physical-genome-v0.2 -> physical-genome-v0.3
  Upgrade appearance model

no physical genome
  Migrate appearance

physical-genome-v0.3 -> physical-genome-v0.3
  current; migration unavailable
```

Do not infer physical ancestry from a Thread's name, birthplace, nationality, culture, language, or existing portrait.

## Migrate or upgrade appearance

Use migration when the Thread has no physical genome or its stored model version is older than Fibre's current model.

When an earlier `THREAD_PHYSICAL_GENOME_MIGRATED` event contains operator-confirmed maternal/paternal physical ancestry, Fibre reuses that evidence automatically:

```bash
npm run appearance:migrate -- \
  --thread-id=thr_... \
  --reason="Upgrade this Thread to Fibre's current calibrated physical appearance model using its recorded parental physical ancestry."
```

The migration changes physical authority and derives a new canonical visual specification from the new genome. The normal Embodiment -> Presentation -> FID pipeline then converges from that authority.

If no trustworthy parental-origin evidence exists, provide it explicitly in a file outside the repository:

```json
{
  "maternal": [
    {
      "population": "operator-confirmed family description",
      "share": 1,
      "referencePopulation": "east_asia"
    }
  ],
  "paternal": [
    {
      "population": "operator-confirmed family description",
      "share": 1,
      "referencePopulation": "east_asia"
    }
  ]
}
```

Then run:

```bash
npm run appearance:migrate -- \
  --thread-id=thr_... \
  --physical-ancestry-file=/tmp/thread-physical-ancestry.json \
  --reason="Install current inherited physical authority from explicit operator-confirmed parental origin."
```

Use the most specific reference population actually supported by evidence. Do not silently refine `east_asia` to `east_asia.han_chinese`, or any other child population, merely because identity context makes it seem plausible.

Current coarse African reference codes are `afr_north`, `afr_west`, `afr_east` and `afr_south`. For an operator-confirmed Moroccan family, use `afr_north` unless more specific physical-lineage evidence is independently available. `afr_north` is currently an explicit evidence code backed by a provisional fallback prior; it is not yet a dedicated North-African facial calibration.

For a Moroccan Thread with both parental lines confirmed only at that level, the Admin migration fields are:

```text
Maternal physical origin: Moroccan family
Maternal physical reference: North Africa (afr_north)
Paternal physical origin: Moroccan family
Paternal physical reference: North Africa (afr_north)
Migration reason: Install Fibre's current physical appearance model using operator-confirmed Moroccan maternal and paternal physical ancestry.
```

After migration:

```bash
npm run appearance:diagnose -- --thread-id=thr_...
```

The expected terminal state is the current physical-genome version, healthy Embodiment-owned visual specification, and a healthy canonical Embodiment.

## Re-render appearance

Use re-render only when the physical genome and canonical specification are already current and correct, but one generated root is independently poor:

```bash
npm run appearance:rerender -- \
  --thread-id=thr_... \
  --reason="Re-render the current calibrated canonical appearance without changing physical authority."
```

Re-render must not change the physical genome or canonical specification. It replaces only the generated canonical root and allows Presentation/FID to converge from that root.

Do not use repeated rerenders as a search strategy. If one current-model render exposes a repeatable morphology problem, return to calibration rather than brute-force sampling images.

## Correct appearance

`appearance:correct` is an exceptional authority correction for cases such as wrong-subject binding or an independently established specification error that cannot be recovered from physical authority. It is not the ordinary inherited-appearance workflow.

See [Canonical visual identity](../architecture/canonical-visual-identity.md#operator-runbook-correcting-appearance).

## Admin UI

Thread Details exposes the same semantics under **Appearance**:

- old model -> **Upgrade appearance model**;
- missing physical authority -> **Migrate appearance**;
- current healthy model -> **Re-render appearance**.

Recorded parental-origin evidence is shown and reused. If evidence is absent, Fibre should use the same place/era **Population Context** as Genesis, rank the plausible family profiles, and preselect one concrete maternal/paternal path. When several profiles are plausible Fibre still picks one editable default rather than handing demographic research to the operator. The proposal is assistance, not ancestry authority; it becomes admitted evidence only when the operator submits the migration.

Current coarse birthplace defaults are temporary migration assistance while that shared Population Context path is completed. Do not add new country-specific fallback tables.

Generic **Fix** never changes appearance authority.

Admin submits one authoritative migration or re-render action and does not poll in the background. **Refresh appearance** is the explicit operator watch: it checks immediately, shows an animated progress indicator while the canonical appearance is still pending, then checks every 20 seconds until the new root is published. At that point it stops and refreshes the Thread view once. Closing the Thread view stops the watch; there is never more than one refresh loop per Appearance section.

## Staging workflow

Appearance CLI commands verify that the local checkout matches staging deployment evidence. After changing appearance runtime code, deploy the exact checkout before operating on staging:

```bash
git switch main
git pull --ff-only
npm run slice:validate
npm run cloud:deploy -- --env staging
```

Keep ancestry input files outside the repository, for example under `/tmp`, so they do not interfere with the clean-checkout deployment guard.
