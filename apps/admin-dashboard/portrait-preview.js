const PORTRAIT_PREVIEW_PLACEMENTS=new Set(["left","center","right"]);

function placement(value){
  return PORTRAIT_PREVIEW_PLACEMENTS.has(value)?value:"left";
}

export function portraitPreviewPosition(rect,{
  placement:requestedPlacement="left",
  size=220,
  gap=10,
  viewportWidth=globalThis.innerWidth??0,
  viewportHeight=globalThis.innerHeight??0,
}={}){
  const side=placement(requestedPlacement);
  const rawLeft=side==="right"
    ?rect.right+gap
    :side==="center"
      ?rect.left+(rect.width-size)/2
      :rect.left-size-gap;
  const maxLeft=Math.max(8,viewportWidth-size-8);
  return Object.freeze({
    left:Math.min(Math.max(8,rawLeft),maxLeft),
    top:Math.min(
      Math.max(8,rect.top+(rect.height-size)/2),
      Math.max(8,viewportHeight-size-8),
    ),
  });
}

let preview=null;

function ensurePreview(target){
  if(!preview){
    preview=document.createElement("div");
    preview.className="portrait-hover-preview";
    preview.setAttribute("popover","manual");
    preview.hidden=true;
  }
  const host=target?.closest?.("dialog[open]")??document.body;
  if(preview.parentElement!==host)host.append(preview);
  return preview;
}

export function hidePortraitPreview(){
  if(!preview)return;
  if(typeof preview.hidePopover==="function"){
    try{preview.hidePopover()}catch{}
  }
  preview.hidden=true;
}

function showThreadPortraitPreview(target){
  const url=target?.dataset?.portraitPreviewUrl;
  if(!url)return;
  const popup=ensurePreview(target);
  const image=document.createElement("img");
  image.src=url;
  image.alt=(target.dataset.portraitPreviewName||"Person")+" portrait preview";
  popup.replaceChildren(image);

  const position=portraitPreviewPosition(target.getBoundingClientRect(),{
    placement:target.dataset.portraitPreviewPlacement,
    viewportWidth:window.innerWidth,
    viewportHeight:window.innerHeight,
  });
  popup.style.left=Math.round(position.left)+"px";
  popup.style.top=Math.round(position.top)+"px";
  popup.hidden=false;
  if(typeof popup.showPopover==="function"){
    try{popup.showPopover()}catch{}
  }
}

export function setPortraitPreviewSource(target,{url=null,name=null,placement:side="left"}={}){
  if(!target)return target;
  target.dataset.portraitPreviewUrl=url??"";
  target.dataset.portraitPreviewName=name??"";
  target.dataset.portraitPreviewPlacement=placement(side);
  if(!url&&preview&&!preview.hidden)hidePortraitPreview();
  return target;
}

export function bindPortraitPreview(target,{url=null,name=null,placement:side="left"}={}){
  if(!target)throw new TypeError("portrait preview target is required");
  setPortraitPreviewSource(target,{url,name,placement:side});
  if(target.dataset.portraitPreviewBound==="true")return target;
  target.dataset.portraitPreviewBound="true";
  target.addEventListener("pointerenter",()=>showThreadPortraitPreview(target));
  target.addEventListener("pointerleave",hidePortraitPreview);
  target.addEventListener("focus",()=>showThreadPortraitPreview(target));
  target.addEventListener("blur",hidePortraitPreview);
  return target;
}
