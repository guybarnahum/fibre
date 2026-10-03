import test from "node:test";
import assert from "node:assert/strict";

import {
  cssSimilarityMatrix,
  displayedImagePoint,
  eyeSimilarityTransform,
  normalizedImagePoint,
} from "./visual-eye-alignment.js";

function apply(transform,point){
  return {
    x:transform.a*point.x+transform.c*point.y+transform.e,
    y:transform.b*point.x+transform.d*point.y+transform.f,
  };
}

test("eye alignment maps both After eye centers onto Before",()=>{
  const transform=eyeSimilarityTransform({
    beforeLeft:{x:120,y:140},
    beforeRight:{x:220,y:140},
    afterLeft:{x:160,y:175},
    afterRight:{x:280,y:185},
  });

  for(const [after,before] of [
    [{x:160,y:175},{x:120,y:140}],
    [{x:280,y:185},{x:220,y:140}],
  ]){
    const mapped=apply(transform,after);
    assert.ok(Math.abs(mapped.x-before.x)<1e-9&&Math.abs(mapped.y-before.y)<1e-9,
      "eye alignment stopped matching corresponding eye centers");
  }
  assert.match(cssSimilarityMatrix(transform),/^matrix\(/u);
});

test("image points survive object-fit contain normalization",()=>{
  const normalized=normalizedImagePoint({
    x:200,
    y:150,
    width:400,
    height:300,
    naturalWidth:400,
    naturalHeight:200,
  });
  assert.deepEqual(normalized,{x:.5,y:.5},"image point normalization drifted");

  assert.deepEqual(
    displayedImagePoint(normalized,{
      width:800,
      height:600,
      naturalWidth:400,
      naturalHeight:200,
    }),
    {x:400,y:300},
    "normalized landmark stopped surviving presentation resize",
  );
});
