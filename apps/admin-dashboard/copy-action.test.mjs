import test from "node:test";
import assert from "node:assert/strict";

import {writeClipboard} from "./copy-action.js";

test("shared copy action serializes structured values and uses the native clipboard",async()=>{
  const writes=[];
  const copied=await writeClipboard({threadId:"thr_copy"},{
    clipboard:{writeText:async text=>writes.push(text)},
    documentRef:null,
  });

  assert.equal(copied,true);
  assert.equal(writes.length,1);
  assert.deepEqual(JSON.parse(writes[0]),{threadId:"thr_copy"},
    "shared copy action changed structured payload");
});

test("shared copy action falls back to the document copy command",async()=>{
  let command=null;
  let removed=false;
  const area={
    value:"",
    style:{},
    setAttribute(){},
    select(){},
    remove(){removed=true},
  };
  const documentRef={
    body:{append(node){assert.equal(node,area)}},
    createElement(tag){
      assert.equal(tag,"textarea");
      return area;
    },
    execCommand(value){
      command=value;
      return true;
    },
  };

  assert.equal(await writeClipboard("Fibre",{clipboard:null,documentRef}),true);
  assert.equal(area.value,"Fibre");
  assert.equal(command,"copy");
  assert.equal(removed,true);
});
