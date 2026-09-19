# FID Card v0.3 Ocean template

This package is the approved visual direction for the Fibre Identity Card front/back presentation.

Canonical canvas: **856 x 540**.

Expected assets:

- `front-base.png` — selected full-color ocean identity artwork derived from `fibre_identity_ocean_security_card.png`.
- `front-foreground.png` — transparent aqua overlay (approved Option B).
- `back-base.png` — matching restrained/utilitarian ocean back.
- `NotoSans-SemiCondensed.ttf` — regular human-readable identity typography.
- `NotoSans-SemiCondensedMedium.ttf` — slightly stronger values where the hierarchy needs it.
- `OFL.txt` — SIL Open Font License 1.1 for the bundled Noto font files.
- `layout.json` — deterministic placement contract for FIA-rendered identity material.

The admitted FID photo remains the authoritative photo input. The renderer presents that photo in black and white on the card; this does not replace or mutate the admitted photo/digest.

No identity fact is authored by these assets. FIN, name, date, credential revision, verification material, and other issuance facts are always stamped by the deterministic FID renderer from the authorized issuance snapshot.

The three PNG assets are renderer inputs only. Public issuance still produces exactly `front.png` and `back.png`.

## Typography

The ocean template bundles Noto Sans SemiCondensed Regular and Medium from the Noto Project. They are redistributed under SIL Open Font License 1.1; the complete license text is retained in `OFL.txt`.

The bundled font bytes are part of the versioned credential template. Local Node and provider deployments must consume these exact assets rather than an operating-system or browser font stack.

## Integrity

`asset-manifest.json` pins the exact PNG, TTF, and license bytes used by this template, including the upstream Git blob identities for the font/license sources. Deployment/runtime composition should fail rather than silently substitute different artwork or typography for the same template version.
