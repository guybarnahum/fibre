// One public, immutable rendition of an already-authorized canonical portrait.
const SIZE=128;
const QUALITY=76;
const ROLE="portrait_thumbnail";
const encoder=new TextEncoder();

async function identity(sourceDigest,threadId){
  const spec=`portrait-thumbnail:v1:webp:128x128:cover:q76:${sourceDigest}:${threadId}`;
  const bytes=await crypto.subtle.digest("SHA-256",encoder.encode(spec));
  const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
  return {
    objectRef:`portrait_thumb_${hash}`,
    mediaId:`media_portrait_thumb_${hash}`,
    provenanceRef:`prov_portrait_thumb_${hash}`,
    snapshotRef:`snapshot_portrait_thumb_${hash}`,
  };
}

function activePortrait(current,channel){
  const presentation=current?.snapshot?.presentation;
  const identity=presentation?.visualIdentity;
  if(channel?.publiclyVisible!==true
    || presentation?.manifest?.fixture===true
    || presentation?.manifest?.lifecycleStatus==="genesis_candidate"
    || identity?.authority!=="authorized_embodiment_projection"
    || identity?.referenceObjectRefs?.length!==1)return null;
  return identity;
}

function existingThumbnail(current,sourceObjectRef){
  return current.snapshot.media.assets.find(a=>
    a.role===ROLE && a.status==="ready" &&
    a.sourceReferences.includes(sourceObjectRef))??null;
}

function isWebp(bytes){
  const v=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const str=(i)=>String.fromCharCode(...v.slice(i,i+4));
  return v.length>=16 && str(0)==="RIFF" && str(8)==="WEBP";
}

export async function publishPublicPortraitThumbnail({
  infra,presentationServer,threadId,transform,
}){
  const channelId=`presentation:${threadId}`;
  const [current,channel]=await Promise.all([
    presentationServer.getSnapshot(channelId),infra.catalog.get(channelId),
  ]);
  if(current?.pointer?.threadId!==threadId)return {published:false,reason:"presentation_missing"};
  const portrait=activePortrait(current,channel);
  if(portrait===null)return {published:false,reason:"not_publicly_authorized"};
  const sourceObjectRef=portrait.referenceObjectRefs[0];
  const sourceHead=await infra.objects.head(sourceObjectRef);
  if(sourceHead===null)return {published:false,reason:"portrait_bytes_unavailable"};
  const sourceDigest=sourceHead.digest;
  const id=await identity(sourceDigest,threadId);
  const existing=existingThumbnail(current,sourceObjectRef);
  if(existing!==null && existing.locator!==id.objectRef){
    throw new Error("public portrait rendition conflicts with current source");
  }

  // Existing immutable rendition is always reused; never re-encode on a retry.
  const prior=await infra.objects.head(id.objectRef);
  let digest=prior?.digest??null;
  if(prior!==null && (prior.metadata?.kind!==ROLE
    || prior.metadata?.sourceDigest!==sourceDigest
    || prior.metadata?.sourceObjectRef!==sourceObjectRef)){
    throw new Error("portrait thumbnail immutable identity collision");
  }
  if(prior===null){
    if(typeof transform!=="function")throw new TypeError("portrait thumbnail transformer is required");
    const source=await infra.objects.get(sourceObjectRef);
    if(source?.digest!==sourceDigest)throw new Error("canonical portrait source changed during thumbnail derivation");
    const bytes=new Uint8Array(await transform(source.bytes));
    if(!isWebp(bytes))throw new Error("portrait thumbnail transformation was not WebP");
    const hash=await crypto.subtle.digest("SHA-256",bytes);
    digest="sha256:"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    await infra.objects.putImmutable(id.objectRef,bytes,digest,{
      kind:ROLE,sourceObjectRef,sourceDigest,
      mediaType:"image/webp",width:SIZE,height:SIZE,quality:QUALITY,
    });
  }

  // Publishing an operational serving index is insufficient: the current
  // immutable Presentation packet must also admit this exact media role.
  if(existing===null){
    const provenance={
      provenanceId:id.provenanceRef,
      kind:"fibre_projection",
      sourceReferences:[portrait.embodimentId,sourceObjectRef],
      note:"Bounded 128x128 WebP derivative of the admitted public portrait; not FID media or new identity evidence.",
    };
    const media={
      mediaId:id.mediaId,kind:"image",role:ROLE,status:"ready",
      locator:id.objectRef,mediaType:"image/webp",sha256:digest,
      width:SIZE,height:SIZE,durationMs:null,posterRef:null,unavailableReason:null,
      sourceReferences:[portrait.embodimentId,sourceObjectRef],
      provenanceRef:id.provenanceRef,generation:null,
    };
    // Resolver cannot serve before both the media admission and directory
    // pointer exist. The catalog entry is deliberately written first.
    await infra.catalog.upsert(`media:${id.objectRef}`,{
      kind:"public_presentation_media",publiclyVisible:true,
      identityCredentialMedia:false,threadId,mediaId:id.mediaId,role:ROLE,
      objectRef:id.objectRef,digest,mediaType:"image/webp",
      provenanceClass:"derived_public_portrait",
      sourceObjectRef,sourceDigest,
    });
    await presentationServer.publishSnapshot({
      channelId,
      objectRef:id.snapshotRef,
      snapshotVersion:`portrait-thumb-${id.objectRef.slice(-24)}`,
      cursor:current.snapshot.cursor,
      expectedSnapshotDigest:current.pointer.snapshotDigest,
      bundle:{
        presentation:current.snapshot.presentation,
        media:{...current.snapshot.media,assets:[...current.snapshot.media.assets,media]},
        provenance:{...current.snapshot.provenance,entries:[
          ...current.snapshot.provenance.entries,provenance,
        ]},
      },
    });
  }else{
    // Crash recovery: restore a missing serving projection only from an
    // already-admitted thumbnail in the immutable Presentation.
    const record=await infra.catalog.get(`media:${id.objectRef}`);
    if(record===null){
      await infra.catalog.upsert(`media:${id.objectRef}`,{
        kind:"public_presentation_media",publiclyVisible:true,
        identityCredentialMedia:false,threadId,mediaId:id.mediaId,role:ROLE,
        objectRef:id.objectRef,digest,mediaType:"image/webp",
        provenanceClass:"derived_public_portrait",
        sourceObjectRef,sourceDigest,
      });
    }
  }
  return {published:true,reused:existing!==null,objectRef:id.objectRef};
}

export async function cloudflarePortraitThumbnail(bytes,images){
  if(typeof images?.input!=="function")throw new Error("Cloudflare Images binding is unavailable");
  const result=await images.input(new Response(bytes).body)
    .transform({width:SIZE,height:SIZE,fit:"cover"})
    .output({format:"image/webp",quality:QUALITY,anim:false});
  const response=result.response();
  if(!response.ok)throw new Error("portrait thumbnail conversion failed");
  return response.arrayBuffer();
}
