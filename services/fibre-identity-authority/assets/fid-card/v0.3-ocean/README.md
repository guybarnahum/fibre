# FID Card v0.3 Ocean template

This package is the approved visual direction for the Fibre Identity Card front/back presentation.

Canonical canvas: **856 x 540**.

Expected assets:

- `front-base.png` — selected full-color ocean identity artwork derived from `fibre_identity_ocean_security_card.png`.
- `front-foreground.png` — transparent aqua overlay (approved Option B).
- `back-base.png` — matching restrained/utilitarian ocean back.
- `layout.json` — deterministic placement contract for FIA-rendered identity material.

The admitted FID photo remains the authoritative photo input. The renderer presents that photo in black and white on the card; this does not replace or mutate the admitted photo/digest.

No identity fact is authored by these assets. FIN, name, date, credential revision, verification material, and other issuance facts are always stamped by the deterministic FID renderer from the authorized issuance snapshot.

The three PNG assets are renderer inputs only. Public issuance still produces exactly `front.png` and `back.png`.

## Integrity

`asset-manifest.json` pins the exact normalized PNG bytes used by this template. Deployment/runtime composition should fail rather than silently substitute different artwork for the same template version.
