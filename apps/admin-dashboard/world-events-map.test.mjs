import assert from "node:assert/strict";
import test from "node:test";
import {worldVenueTileScene} from "./world-events-map.js";

test("the venue map preserves independent World coordinates beneath the map tiles",()=>{
  const venues=[
    {placeRef:"wpl_park",lat:41.704,long:44.803},
    {placeRef:"wpl_cafe",lat:41.707,long:44.809},
  ];
  const scene=worldVenueTileScene(venues,500,310);
  const [park,cafe]=scene.markers;
  assert.deepEqual(scene.markers.map(x=>x.site.placeRef),venues.map(x=>x.placeRef),
    "the map lost an attested venue");
  assert.ok(park.left<cafe.left&&park.top>cafe.top,
    "map positioning reversed or merged real venues");
  assert.ok(scene.markers.every(x=>x.left>0&&x.left<500&&x.top>0&&x.top<310),
    "a verified venue fell outside the map");
  assert.ok(scene.tiles.length>0&&scene.tiles.length<=12,
    "the map requested an excessive number of tiles");
  assert.ok(scene.tiles.every(tile=>tile.url.startsWith("https://tile.openstreetmap.org/")),
    "the map used an unrecognized tile origin");
});

test("an unknown place never earns a fabricated map pin",()=>{
  const scene=worldVenueTileScene([{placeRef:"wpl_unknown",lat:null,long:44.8}],500,310);
  assert.equal(scene.markers.length,0,"an ungrounded venue gained a map location");
  assert.equal(scene.tiles.length,0,"missing coordinates triggered map requests");
});
