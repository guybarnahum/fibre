import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFidCardTemplateFromPngAssets } from "../src/fid-card-template-assets.mjs";

const ROOT = new URL("../assets/fid-card/v0.3-ocean/", import.meta.url);
const VERSION = "fid-card-template-v0.3-ocean";

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

test("ocean FID template carries its exact versioned font assets", async () => {
  const assets = await oceanAssets();
  const template = await createFidCardTemplateFromPngAssets({ version:VERSION, ...assets });
  assert.equal(template.fonts.regular.asset, "NotoSans-SemiCondensed.ttf", "regular font role drifted");
  assert.equal(template.fonts.medium.asset, "NotoSans-SemiCondensedMedium.ttf", "medium font role drifted");
  assert.deepEqual(template.fonts.regular.bytes, assets.fontAssets["NotoSans-SemiCondensed.ttf"], "regular font bytes drifted");
  assert.deepEqual(template.fonts.medium.bytes, assets.fontAssets["NotoSans-SemiCondensedMedium.ttf"], "medium font bytes drifted");
});

test("FID template rejects a missing declared font asset", async () => {
  const assets = await oceanAssets();
  delete assets.fontAssets["NotoSans-SemiCondensedMedium.ttf"];
  await assert.rejects(
    () => createFidCardTemplateFromPngAssets({ version:VERSION, ...assets }),
    /FID font asset NotoSans-SemiCondensedMedium\.ttf is required/,
  );
});
