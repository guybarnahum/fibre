import test from "node:test";
import assert from "node:assert/strict";

import {portraitPreviewPosition,useThumbnailFallback} from "./portrait-preview.js";

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

test("broken small portrait gives one actionable warning and uses the full-image fallback",()=>{
  const originalWarn=console.warn;
  const warnings=[];
  console.warn=(...args)=>warnings.push(args);
  try{
    const image={src:"/api/thread-assets/thumb_test",addEventListener(type,handler){
      assert.equal(type,"error");
      this.fail=handler;
    }};
    useThumbnailFallback(image,{
      threadId:"thr_warning_example",
      thumbnailUrl:image.src,
      fallbackUrl:"/api/thread-assets/portrait_original",
      context:"thread_list",
    });
    image.fail();
    assert.equal(image.src,"/api/thread-assets/portrait_original",
      "failed thumbnail did not fall back to the original");
    assert.equal(warnings.length,1,"thumbnail failure was not diagnosed");
    assert.equal(warnings[0][1].threadId,"thr_warning_example");
    assert.equal(warnings[0][1].thumbnailObjectRef,"thumb_test");
    const duplicate={src:"/api/thread-assets/thumb_test",addEventListener(_type,handler){
      this.fail=handler;
    }};
    useThumbnailFallback(duplicate,{
      threadId:"thr_warning_example",thumbnailUrl:duplicate.src,
      fallbackUrl:"/api/thread-assets/portrait_original",
    });
    duplicate.fail();
    assert.equal(warnings.length,1,"repeated failures should not flood the console");
  }finally{
    console.warn=originalWarn;
  }
});
