let preview=null;

function ensurePreview(){
  if(preview)return preview;
  preview=document.createElement("div");
  preview.className="portrait-hover-preview";
  preview.hidden=true;
  document.body.append(preview);
  return preview;
}

export function hidePortraitPreview(){
  if(preview)preview.hidden=true;
}

function showPortraitPreview(target){
  const url=target?.dataset?.portraitPreviewUrl;
  if(!url)return;
  const popup=ensurePreview();
  const image=document.createElement("img");
  image.src=url;
  image.alt=(target.dataset.portraitPreviewName||"Person")+" portrait preview";
  popup.replaceChildren(image);
  popup.hidden=false;

  const size=220;
  const gap=10;
  const rect=target.getBoundingClientRect();
  const left=rect.right+gap+size<=window.innerWidth
    ?rect.right+gap
    :Math.max(8,rect.left-size-gap);
  const top=Math.min(
    Math.max(8,rect.top+(rect.height-size)/2),
    Math.max(8,window.innerHeight-size-8),
  );
  popup.style.left=Math.round(left)+"px";
  popup.style.top=Math.round(top)+"px";
}

export function setPortraitPreviewSource(target,{url=null,name=null}={}){
  if(!target)return target;
  target.dataset.portraitPreviewUrl=url??"";
  target.dataset.portraitPreviewName=name??"";
  if(!url&&preview&&!preview.hidden)hidePortraitPreview();
  return target;
}

export function bindPortraitPreview(target,{url=null,name=null}={}){
  if(!target)throw new TypeError("portrait preview target is required");
  setPortraitPreviewSource(target,{url,name});
  if(target.dataset.portraitPreviewBound==="true")return target;
  target.dataset.portraitPreviewBound="true";
  target.addEventListener("pointerenter",()=>showPortraitPreview(target));
  target.addEventListener("pointerleave",hidePortraitPreview);
  target.addEventListener("focus",()=>showPortraitPreview(target));
  target.addEventListener("blur",hidePortraitPreview);
  return target;
}
