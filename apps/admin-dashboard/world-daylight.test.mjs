import test from "node:test";
import assert from "node:assert/strict";
import { solarDriftPixels, sunIsUpAt, worldNightPath } from "./world-daylight.js";

test("Admin solar shading distinguishes geographical day from night across seasons", () => {
  const equinox = "2026-03-20T12:00:00Z";
  assert.equal(sunIsUpAt(0, 0, equinox), true, "Greenwich noon should be sunlit");
  assert.equal(sunIsUpAt(0, 180, equinox), false, "opposite longitude should be dark");

  const june = "2026-06-21T12:00:00Z";
  assert.equal(sunIsUpAt(89, 0, june), true, "Arctic summer should have daylight");
  assert.equal(sunIsUpAt(-89, 0, june), false, "Antarctic winter should be dark");
  assert.ok(worldNightPath(equinox).startsWith("M"), "night overlay must have visible map geometry");
});


test("Solar movement stays continuous across the date-line seam", () => {
  const midnight = solarDriftPixels("2026-03-20T00:00:00Z");
  const noon = solarDriftPixels("2026-03-20T12:00:00Z");
  assert.ok(midnight < -9 && midnight > -12, "night boundary must move smoothly across the date line");
  assert.ok(Math.abs(midnight - noon) < 0.1, "seam must not cause a sudden full-map jump");
});
