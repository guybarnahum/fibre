import test from "node:test";
import assert from "node:assert/strict";

import {portraitPreviewPosition} from "./portrait-preview.js";

test("portrait preview placement is left by default and supports center or right",()=>{
  const rect={left:300,right:330,top:200,height:30,width:30};
  const viewport={viewportWidth:1000,viewportHeight:800};

  assert.equal(
    portraitPreviewPosition(rect,viewport).left,
    70,
    "portrait preview default stopped being left",
  );
  assert.equal(
    portraitPreviewPosition(rect,{...viewport,placement:"center"}).left,
    205,
    "portrait preview center placement drifted",
  );
  assert.equal(
    portraitPreviewPosition(rect,{...viewport,placement:"right"}).left,
    340,
    "portrait preview right placement drifted",
  );
});
