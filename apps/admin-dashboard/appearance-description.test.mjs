import test from "node:test";
import assert from "node:assert/strict";

import {parseCanonicalAppearancePresentation} from "./appearance-description.mjs";

test("canonical Appearance presentation pairs semantic traits with precision coordinates",()=>{
  const description=[
    "CANONICAL APPEARANCE LAYERS canonical-visual-appearance-layers-v0.1",
    "SEX","male",
    "STRUCTURAL MORPHOLOGY",
    "Identity-critical inherited facial geometry — face and midface: faceWidth: medium; jawWidth: medium. Eye and orbital anatomy: eyeSpacing: average. Treat these facial relationships as one coherent anatomy. Continuous facial coordinates are secondary precision and preserve this individual's proportions inside the semantic anatomy: faceBreadth: -0.07 (-1 narrower, +1 broader); jawBreadth: -0.09 (-1 narrower, +1 broader); eyeSpacing: 0.04 (-1 closer, +1 wider).",
    "REFERENCE GEOMETRY STATE",
    "Normalized reference geometry state at age 25; this is rendering normalization, not historical evidence. Body composition: average; muscular development: moderate; facial fullness: moderate facial soft tissue. Preserve these ordinary proportions and asymmetries; do not slim or symmetrize the person.",
    "SURFACE PHENOTYPE",
    "Inherited surface phenotype — pigmentation and hair: eyeColor: hazel; hairTexture: wavy. Continuous inherited surface coordinates: eyePigmentation: -0.08 (-1 lighter, +1 darker); hairForm: -0.09 (-1 straighter, +1 curlier/coiler). Surface phenotype must not replace or reinterpret the structural facial geometry.",
    "REFERENCE SURFACE STATE",
    "Reference surface state at age 25; this is rendering normalization, not historical evidence. Reference grooming: facial hair: short trimmed beard; hairline: full natural hairline; head hair: cropped, simply groomed, right part. Preserve ordinary skin and grooming variation.",
  ].join("\n");

  const parsed=parseCanonicalAppearancePresentation(description);
  assert.equal(parsed?.version,"canonical-visual-appearance-layers-v0.1");
  assert.equal(parsed?.sex,"male");

  const face=parsed.structural.groups.find(group=>group.title.includes("face and midface"));
  assert.equal(face?.rows.find(row=>row.key==="faceWidth")?.coordinate?.value,"-0.07",
    "face width lost its continuous coordinate");
  assert.equal(face?.rows.find(row=>row.key==="jawWidth")?.coordinate?.value,"-0.09",
    "jaw width lost its continuous coordinate");

  const surface=parsed.surface.groups[0];
  assert.equal(surface.rows.find(row=>row.key==="eyeColor")?.coordinate?.value,"-0.08",
    "eye color lost pigmentation coordinate");
  assert.equal(surface.rows.find(row=>row.key==="hairTexture")?.coordinate?.value,"-0.09",
    "hair texture lost form coordinate");

  assert.ok(parsed.referenceGeometry.groups.some(group=>(
    group.rows.some(row=>row.key==="Body composition"&&row.value==="average")
  )),"reference body state did not become readable fields");
  assert.ok(parsed.structural.notes.some(note=>note.includes("coherent anatomy")),
    "structural guidance disappeared");
});
