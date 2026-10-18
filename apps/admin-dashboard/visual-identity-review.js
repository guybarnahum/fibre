// Authenticated, read-only population likeness review. Marks live only in this tab.
const byId=new Map();
const reviews=new Map();
const rows=document.querySelector("#rows");
const status=document.querySelector("#status");
const next=document.querySelector("#next");
const flagged=document.querySelector("#mismatches");
let population=[],offset=0,loading=false,failures=0;

async function getJson(path){
  const response=await fetch(path,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("HTTP "+response.status+" reading "+path);
  return response.json();
}
function node(tag,className,text){
  const result=document.createElement(tag);
  if(className)result.className=className;
  if(text!==undefined)result.textContent=String(text);
  return result;
}
function publicationAsset(assets,role){
  return assets.find(asset=>asset?.role===role
    && asset?.source==="current_public_presentation" && asset?.url)
    ??assets.find(asset=>asset?.role===role && asset?.url)??null;
}
function preview(role,asset,canonicalRef){
  const pane=node("section","pane");
  pane.append(node("h3",null,role));
  if(asset?.url){
    const img=node("img",role.startsWith("Canonical")?"canonical-thumb":null);
    img.src=asset.url;img.alt=role;img.loading="lazy";img.decoding="async";
    img.onerror=()=>img.replaceWith(node("p","missing","Image unavailable"));
    const link=node("a");
    link.href=asset.url;link.target="_blank";link.rel="noopener";
    link.title="Open image at original resolution";
    link.append(img);
    pane.append(link);
  }else pane.append(node("p","missing","Image missing or not available"));
  const meta=node("p","meta",role.startsWith("Canonical")
    ?"Canonical ref: "+(canonicalRef??"unavailable")
    :"Media: "+(asset?.objectRef??"unavailable")
       +(asset?.width?" · "+asset.width+"×"+asset.height:""));
  meta.title=meta.textContent;
  pane.append(meta);
  return pane;
}
function updateStatus(){
  const count=[...reviews.values()].filter(x=>x.decision==="mismatch").length;
  status.textContent=byId.size+"/"+population.length+" admitted Threads loaded · "
    +count+" marked mismatch"
    +(failures?" · "+failures+" unavailable":"");
  next.disabled=loading||offset>=population.length;
}
function render(person,identity){
  const threadId=person.threadId;
  const assets=Array.isArray(identity?.assets)?identity.assets:[];
  const canonicalRef=identity?.visualIdentity?.referenceObjectRefs?.[0]??null;
  const canonical=assets.find(asset=>asset?.role==="canonical_portrait"
    && asset.objectRef===canonicalRef)??null;
  const thumb=publicationAsset(assets,"portrait_thumbnail");
  const fid=publicationAsset(assets,"official_id_photo");
  const card=node("article");
  card.dataset.threadId=threadId;
  const title=node("h2",null,identity?.displayName??person.identity?.name??threadId);
  const link=node("a",null,threadId);
  link.href="/thread/"+encodeURIComponent(threadId);
  link.target="_blank";link.rel="noopener";
  title.append(link);card.append(title);
  const pair=node("div","pair");
  pair.append(preview("Canonical portrait",canonical,canonicalRef),
    preview("Official FID photo",fid,canonicalRef),
    preview("Derived thumbnail",thumb,canonicalRef));
  card.append(pair);
  if(thumb?.url&&!canonicalRef)
    card.append(node("p","state-warning","Canonical reference is missing from the current identity projection."));
  const controls=node("div","review");
  const review={decision:"unreviewed",note:""};
  reviews.set(threadId,review);
  for(const [decision,label] of [
    ["match","Same person"],["mismatch","Identity mismatch"],["uncertain","Uncertain"]
  ]){
    const button=node("button",null,label);
    button.type="button";button.dataset.decision=decision;
    button.onclick=()=>{
      review.decision=review.decision===decision?"unreviewed":decision;
      for(const option of controls.querySelectorAll("button[data-decision]"))
        option.classList.toggle("selected",option.dataset.decision===review.decision);
      card.classList.toggle("mismatch",review.decision==="mismatch");
      card.hidden=flagged.checked&&review.decision!=="mismatch";
      updateStatus();
    };
    controls.append(button);
  }
  const note=node("input");
  note.type="text";note.placeholder="Optional observation";
  note.setAttribute("aria-label","Review note for "+threadId);
  note.oninput=()=>{review.note=note.value;};
  controls.append(note);card.append(controls);
  card.hidden=flagged.checked;
  rows.append(card);
  byId.set(threadId,{person,identity,card,canonical,canonicalRef,thumb,fid});
}
async function loadNext(){
  if(loading||offset>=population.length)return;
  loading=true;next.disabled=true;
  const work=population.slice(offset,offset+20);offset+=work.length;
  let index=0;
  await Promise.all(Array.from({length:Math.min(3,work.length)},async()=>{
    while(index<work.length){
      const person=work[index++];
      try{
        const response=await getJson("/api/threads/"+encodeURIComponent(person.threadId)+"/identity");
        if(!response.identity)throw new Error("Identity unavailable");
        render(person,response.identity);
      }catch(error){
        failures++;
        const row=node("article");
        row.append(node("h2",null,person.threadId),
          node("p","missing",error.message));
        rows.append(row);
      }
      updateStatus();
    }
  }));
  loading=false;updateStatus();
}
next.addEventListener("click",()=>void loadNext());
flagged.addEventListener("change",()=>{
  for(const [threadId,{card}] of byId)
    card.hidden=flagged.checked&&reviews.get(threadId)?.decision!=="mismatch";
});
document.querySelector("#export").addEventListener("click",()=>{
  const threads=[...byId].map(([threadId,{person,identity,canonical,canonicalRef,thumb,fid}])=>({
    threadId,displayName:identity?.displayName??person?.identity?.name??null,
    status:reviews.get(threadId)?.decision??"unreviewed",
    note:reviews.get(threadId)?.note??"",
    canonicalRef,
    canonicalSha256:canonical?.sha256??null,
    thumbnailRef:thumb?.objectRef??null,
    thumbnailSha256:thumb?.sha256??null,
    officialPhotoRef:fid?.objectRef??null,
    officialPhotoSha256:fid?.sha256??null,
  }));
  const result={kind:"fibre-visual-identity-review",schemaVersion:1,
    environment:location.host,reviewedAt:new Date().toISOString(),
    totalAdmittedThreads:population.length,
    reviewedCount:threads.filter(t=>t.status!=="unreviewed").length,threads};
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],
    {type:"application/json"}));
  const anchor=node("a");
  anchor.href=url;anchor.download="fibre-visual-identity-review-"
    +new Date().toISOString().slice(0,10)+".json";
  document.body.append(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
try{
  const payload=await getJson("/api/threads/population");
  if(!Array.isArray(payload.threads))throw new Error("Admin population response is malformed");
  population=payload.threads.filter(person=>person.admitted===true)
    .sort((a,b)=>(a.identity?.name??a.threadId).localeCompare(b.identity?.name??b.threadId));
  updateStatus();
  await loadNext();
}catch(error){
  status.textContent="Cannot read authenticated Admin population: "+error.message;
}
