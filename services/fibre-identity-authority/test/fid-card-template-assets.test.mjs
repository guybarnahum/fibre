import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFidCardTemplateFromPngAssets } from "../src/fid-card-template-assets.mjs";

const ROOT = new URL("../assets/fid-card/v0.3-ocean/", import.meta.url);
const TEMPLATE_VERSION = "fid-card-template-v0.3-ocean";

async function oceanAssets() {
  const [layoutText, frontBasePng, frontForegroundPng, backBasePng, regular, medium] = await Promise.all([
    readFile(new URL("layout.json", ROOT), "utf8"),
    readFile(new URL("front-base.png", ROOT)),
    readFile(new URL("front-foreground.png", ROOT)),
    readFile(new URL("back-base.png", ROOT)),
    readFile(new URL("NotoSans-SemiCondensed.ttf", ROOT)),
    readFile(new URL("NotoSans-SemiCondensedMedium.ttf", ROOT)),
  ]);
  return {
    layout:JSON.parse(layoutText),
    frontBasePng,
    frontForegroundPng,
    backBasePng,
    fontAssets:{
      "NotoSans-SemiCondensed.ttf":regular,
      "NotoSans-SemiCondensedMedium.ttf":medium,
    },
  };
}

test("ocean FID template hydrates exact declared OpenType font roles", async () => {
  const assets = await oceanAssets();
  const template = await createFidCardTemplateFromPngAssets({ version:TEMPLATE_VERSION, ...assets });

  assert.deepEqual(Object.keys(template.fonts), ["regular", "medium"]);
  assert.equal(template.fonts.regular.asset, "NotoSans-SemiCondensed.ttf");
  assert.equal(template.fonts.medium.asset, "NotoSans-SemiCondensedMedium.ttf");
  assert.ok(template.fonts.regular.font.numGlyphs > 1000, "regular font did not parse");
  assert.ok(template.fonts.medium.font.numGlyphs > 1000, "medium font did not parse");
  assert.notEqual(template.fonts.regular.font.charToGlyphIndex("A"), 0, "regular font lacks Latin glyphs");
  assert.notEqual(template.fonts.medium.font.charToGlyphIndex("A"), 0, "medium font lacks Latin glyphs");
  assert.equal(template.typography.styles.finValue.font, "medium");
  assert.equal(template.layout.front.name.typography.value, "identityValue");
});

test("ocean FID typography declarations preserve the legacy bitmap fallback until font rendering is selected", async () => {
  const { fontAssets:ignored, ...assets } = await oceanAssets();
  void ignored;
  const template = await createFidCardTemplateFromPngAssets({ version:TEMPLATE_VERSION, ...assets });
  assert.deepEqual(template.fonts, {});
  assert.equal(template.typography.fonts.regular.asset, "NotoSans-SemiCondensed.ttf");
});

test("FID template typography fails closed on undeclared style font roles", async () => {
  const assets = await oceanAssets();
  assets.layout.typography.styles.finValue.font = "missing";
  await assert.rejects(
    () => createFidCardTemplateFromPngAssets({ version:TEMPLATE_VERSION, ...assets }),
    /references undeclared font missing/,
  );
});

test("FID template font hydration fails closed when declared assets are missing", async () => {
  const assets = await oceanAssets();
  delete assets.fontAssets["NotoSans-SemiCondensedMedium.ttf"];
  await assert.rejects(
    () => createFidCardTemplateFromPngAssets({ version:TEMPLATE_VERSION, ...assets }),
    /NotoSans-SemiCondensedMedium\.ttf for role medium is required/,
  );
});
