import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi } from "../src/http/read-api.mjs";
import { publishPublicPortraitThumbnail } from "../src/portrait-thumbnail.mjs";

const THUMB=Buffer.from(
  "UklGRmIAAABXRUJQVlA4IFYAAABwBgCdASqAAIAAPolEn0wlI6KiIIgAoBEJaW7hdJAAT22IvEFRz2xF4gqOe2IvEFRz2xF4gqOe2IvEE2AA/v2mP/5HYQ3Ycv/BskU2B2XyMAgAAAAAAA==",
  "base64",
);
const SOURCE_REF="canonical_portrait_source_demo";
const THREAD="thr_pr39_g2_04";
const digest=(bytes)=>"sha256:"+createHash("sha256").update(bytes).digest("hex");

async function fixture({visible=true,portrait=true}={}){
  const infra=createMemoryInfraDriver();
  const presentationServer=createThreadPresentationServer({infra});
  const base=new URL("../../../fixtures/thread-presentation/can-tho/",import.meta.url);
  const presentation=JSON.parse(await readFile(new URL("presentation.json",base),"utf8"));
  const media=JSON.parse(await readFile(new URL("media.json",base),"utf8"));
  const provenance=JSON.parse(await readFile(new URL("provenance.json",base),"utf8"));
  assert.equal(presentation.manifest.threadId,THREAD);
  presentation.schemaVersion="thread-presentation-packet-v0.2";
  presentation.manifest={...presentation.manifest,fixture:false,lifecycleStatus:"active"};
  presentation.civilIdentity=null;
  presentation.identityCard=null;
  presentation.visualIdentity=portrait?{
    projectionVersion:"thread-visual-identity-projection-v0.1",
    authority:"authorized_embodiment_projection",
    embodimentId:"emb_test_approved",
    embodimentRevision:1,
    specificationDigest:"sha256:"+"c".repeat(64),
    subjectDescription:"A distinctive admitted public portrait of the Thread.",
    renderDescription:"Officially authorized synthetic portrait reference.",
    sourceReferences:["emb_test_approved"],
    permissionReferences:[],
    referenceObjectRefs:[SOURCE_REF],
    provenanceRef:"prov_public_portrait",
  }:null;
  if(portrait)provenance.entries.push({
    provenanceId:"prov_public_portrait",
    kind:"fibre_projection",
    sourceReferences:["emb_test_approved",SOURCE_REF],
    note:"Public Embodiment projection",
  });
  const source=new Uint8Array([3,2,1,0]);
  await infra.objects.putImmutable(SOURCE_REF,source,digest(source),{kind:"canonical_portrait"});
  await presentationServer.publishSnapshot({
    channelId:"presentation:"+THREAD,
    objectRef:"snapshot_public_thumbnail_fixture",
    snapshotVersion:"fixture-thumbnail-v1",
    bundle:{presentation,media,provenance},
    catalog:{publiclyVisible:visible},
  });
  const api=createPresentationReadApi({infra,presentationServer,
    async openStream(){return new Response(null,{status:426});}});
  return {infra,presentationServer,api};
}

test("public portrait has one immutable, servable thumbnail; retry neither regenerates nor republishes",async()=>{
  const f=await fixture();
  let transformations=0;
  let originalReads=0;
  const infra={
    ...f.infra,
    objects:{
      ...f.infra.objects,
      async get(ref){
        if(ref===SOURCE_REF)originalReads+=1;
        return f.infra.objects.get(ref);
      },
    },
  };
  const publish=()=>publishPublicPortraitThumbnail({
    ...f,infra,threadId:THREAD,
    async transform(){transformations++;return THUMB;},
  });
  const first=await publish();
  assert.equal(first.published,true,"admitted portrait did not publish a thumbnail");
  const route=await f.api.fetch(new Request("https://api.insidefibre.com/api/assets/"+first.objectRef));
  assert.equal(route.status,200,"published thumbnail was not publicly servable");
  assert.equal(route.headers.get("Content-Type"),"image/webp");
  assert.deepEqual(Buffer.from(await route.arrayBuffer()),THUMB,
    "public route did not return thumbnail bytes");
  const indexed=await f.infra.catalog.get("presentation:"+THREAD);
  assert.equal(indexed.publicDirectory.portraitThumbnailObjectRef,first.objectRef,
    "public directory must name only a ready derivative");
  const directory=await f.api.fetch(new Request("https://api.insidefibre.com/api/threads/search?limit=10"));
  const page=await directory.json();
  assert.equal(page.threads[0]?.portraitThumbnailObjectRef,first.objectRef,
    "public Thread discovery must expose the admitted preview, not a full portrait");
  const second=await publish();
  assert.equal(second.reused,true,"same portrait should reuse its immutable rendition");
  assert.equal(transformations,1,"repeated completion must not reencode the image");
  assert.equal(originalReads,1,"repeat should not re-download the full portrait");
  const channel=await f.infra.catalog.get("presentation:"+THREAD);
  await f.infra.catalog.upsert("presentation:"+THREAD,{
    ...channel,publiclyVisible:false,
  });
  const revoked=await f.api.fetch(new Request("https://api.insidefibre.com/api/assets/"+first.objectRef));
  assert.equal(revoked.status,404,
    "a withdrawn public Presentation must no longer serve its thumbnail");
});

test("non-public or unprojected portrait cannot produce a public thumbnail",async()=>{
  for(const opts of [{visible:false,portrait:true},{visible:true,portrait:false}]){
    const f=await fixture(opts);
    let touched=false;
    const result=await publishPublicPortraitThumbnail({
      ...f,threadId:THREAD,transform:async()=>{touched=true;return THUMB;},
    });
    assert.equal(result.published,false,"non-public portrait acquired a thumbnail");
    assert.equal(touched,false,"non-public portrait bytes were transformed");
    const index=await f.infra.catalog.get("presentation:"+THREAD);
    assert.equal(index.publicDirectory.portraitThumbnailObjectRef,null,
      "private or absent portrait must remain unmapped in the directory");
  }
});


test("a prior derivative can be re-admitted after Presentation evolves without rewriting immutable snapshots",async()=>{
  const f=await fixture();
  let transformations=0;
  const publish=()=>publishPublicPortraitThumbnail({
    ...f,threadId:THREAD,async transform(){transformations++;return THUMB;},
  });
  const first=await publish();
  const current=await f.presentationServer.getSnapshot("presentation:"+THREAD);
  const derivative=current.snapshot.media.assets.find(a=>a.role==="portrait_thumbnail");
  await f.presentationServer.publishSnapshot({
    channelId:"presentation:"+THREAD,
    objectRef:"snapshot_after_portrait_revision",
    snapshotVersion:"portrait-revision-v2",
    cursor:current.snapshot.cursor,
    expectedSnapshotDigest:current.pointer.snapshotDigest,
    bundle:{
      presentation:current.snapshot.presentation,
      media:{...current.snapshot.media,
        assets:current.snapshot.media.assets.filter(a=>a.mediaId!==derivative.mediaId)},
      provenance:{...current.snapshot.provenance,
        entries:current.snapshot.provenance.entries.filter(p=>p.provenanceId!==derivative.provenanceRef)},
    },
  });
  const second=await publish();
  assert.equal(second.published,true,"current portrait could not regain its public derivative");
  assert.equal(second.objectRef,first.objectRef,"an unchanged portrait must reuse thumbnail bytes");
  assert.equal(transformations,1,"re-admission must not transform original bytes twice");
  const served=await f.api.fetch(new Request("https://api.insidefibre.com/api/assets/"+second.objectRef));
  assert.equal(served.status,200,"re-admitted current portrait must be servable");
});
