import test from "node:test";
import assert from "node:assert/strict";
import {renderVisualAgeAnchors} from "./visual-age-anchors.js";

function fakeElement(tag){
  return {
    tagName:tag.toUpperCase(),className:"",children:[],isConnected:false,disabled:false,
    classList:{add(){}},listeners:new Map(),
    append(...nodes){this.children.push(...nodes);},
    replaceChildren(...nodes){this.children=nodes;},
    addEventListener(type,fn){this.listeners.set(type,fn);},
    setAttribute(name,value){this[name]=value;},
  };
}
function find(root,selector){
  if(root.className?.split(" ").includes(selector))return root;
  for(const child of root.children??[]){
    const match=find(child,selector);
    if(match)return match;
  }
  return null;
}
async function flushUntil(predicate){
  for(let count=0;count<40;count++){
    if(predicate())return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  throw new Error("Age portrait did not recover its view state");
}

test("Observatory redraw resumes pending age image and exposes approved review only after verified preview",async()=>{
  const previousDocument=globalThis.document;
  const previousFetch=globalThis.fetch;
  let completeStatus;
  const candidateStatus=new Promise(resolve=>{completeStatus=resolve;});
  const candidateId="visual_age_candidate_preserved";
  let previewReads=0;
  globalThis.document={
    createElement:fakeElement,
    createElementNS:(_namespace,name)=>fakeElement(name),
  };
  globalThis.fetch=async url=>{
    if(url.endsWith("/age-anchors")){
      return Response.json({anchors:[],candidates:[{
        candidateId,targetAgeYears:12,requestedAt:"2026-10-19T12:00:00Z",
      }]});
    }
    if(url.endsWith("/candidates/"+candidateId))return candidateStatus;
    if(url.endsWith("/candidates/"+candidateId+"/portrait")){
      previewReads++;
      return new Response(new Uint8Array([137,80,78,71]),{
        headers:{"content-type":"image/png"},
      });
    }
    throw new Error("Unexpected request "+url);
  };
  try{
    // The prior Observatory DOM was destroyed. Only the catalog candidate remains.
    const view=renderVisualAgeAnchors({threadId:"thr_visual",threadName:"Yael"});
    view.isConnected=true;
    await flushUntil(()=>find(view,"fa-waiting")!==null);
    assert.ok(find(view,"thread-action-progress"),"Pending portrait lacks animated progress");
    assert.equal(find(view,"thread-age-anchor-gallery")?.children.length,1,
      "Canonical portrait disappeared while generating");
    assert.equal(find(view,"thread-age-anchor-review")?.children.length,0,
      "Pending portrait was offered for approval");

    completeStatus(Response.json({state:"ready",candidateId,targetAgeYears:12}));
    await flushUntil(()=>find(view,"thread-age-anchor-review")?.children.length===3);
    assert.equal(previewReads,1,"Unverified portrait was offered for approval");
    const buttons=find(view,"thread-age-anchor-review-actions");
    assert.ok(buttons?.children.some(item=>item.textContent==="Approve age portrait"),
      "Verified childhood portrait cannot be admitted");
    assert.equal(find(view,"thread-age-anchor-gallery")?.children.length,1,
      "Canonical age-25 identity was replaced");
  }finally{
    globalThis.document=previousDocument;
    globalThis.fetch=previousFetch;
  }
});
