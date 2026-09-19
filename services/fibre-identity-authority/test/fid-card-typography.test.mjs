import assert from "node:assert/strict";
import test from "node:test";

import { drawFidText } from "../src/fid-card-typography.mjs";
import { oceanFidTemplate } from "./fid-card-test-template.mjs";

function surface() {
  const rgba = new Uint8Array(320 * 80 * 4);
  for (let index = 0; index < rgba.length; index += 4) rgba.set([255, 255, 255, 255], index);
  return { width:320, height:80, rgba };
}

function renderText(template, value, style) {
  const target = surface();
  drawFidText(target, value, 8, 8, style, template.fonts, [0, 0, 0, 255]);
  return target.rgba;
}

test("FID typography is deterministic and preserves identity case", async () => {
  const template = await oceanFidTemplate();
  const style = template.layout.typography.styles.identityValue;
  const mixed = renderText(template, "Mira Vale", style);
  assert.deepEqual(renderText(template, "Mira Vale", style), mixed, "same identity text rendered differently");
  assert.notDeepEqual(renderText(template, "MIRA VALE", style), mixed, "identity case was flattened");
});

test("FID typography honors the declared font role", async () => {
  const template = await oceanFidTemplate();
  const medium = template.layout.typography.styles.identityValue;
  const regular = { ...medium, font:"regular" };
  assert.notDeepEqual(
    renderText(template, "Mira Vale", regular),
    renderText(template, "Mira Vale", medium),
    "regular and medium roles rendered identically",
  );
});
