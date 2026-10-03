import { bindPortraitPreview, hidePortraitPreview, setPortraitPreviewSource } from "./portrait-preview.js";
import { countryFlag } from "./thread-label-cache.js";

const portraitCache=new Map();

function clean(value){
  return typeof value==="string"&&value.trim()!==""?value.trim():null;
}

export function threadInitials(value){
  const parts=String(value??"").trim().split(/\s+/u).filter(Boolean);
  if(parts.length===0)return "·";
  if(parts.length===1)return parts[0].slice(0,1).toLocaleUpperCase();
  return (parts[0].slice(0,1)+parts.at(-1).slice(0,1)).toLocaleUpperCase();
}

export function preferredThreadPortraitUrl(identity){
  const assets=Array.isArray(identity?.assets)?identity.assets:[];
  const asset=assets.find((entry)=>entry?.role==="official_id_photo"&&entry?.url)
    ??assets.find((entry)=>entry?.role==="canonical_portrait"&&entry?.url)
    ??assets.find((entry)=>entry?.url&&String(entry.mediaType??"").startsWith("image/"))
    ??null;
  return typeof asset?.url==="string"&&asset.url!==""?asset.url:null;
}

function locationParts(value){
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    const city=clean(value.city??value.locality);
    const country=clean(value.country);
    const explicitCode=clean(value.countryCode)?.toUpperCase()??null;
    const countryCode=explicitCode??(/^[A-Za-z]{2}$/u.test(country??"")?country.toUpperCase():null);
    const displayName=clean(value.displayName)??([city,country].filter(Boolean).join(", ")||null);
    if(city||country)return {city,country,displayName,countryCode};
    return locationParts(displayName);
  }
  const text=clean(value);
  if(text===null)return {city:null,country:null,displayName:null,countryCode:null};
  if(text.includes("/")){
    const [country,...cityParts]=text.split("/");
    const city=cityParts.join("/").trim();
    return {city:clean(city),country:clean(country),displayName:[clean(city),clean(country)].filter(Boolean).join(", "),countryCode:null};
  }
  const comma=text.lastIndexOf(",");
  if(comma>0){
    const city=clean(text.slice(0,comma));
    const country=clean(text.slice(comma+1));
    return {city,country,displayName:text,countryCode:null};
  }
  return {city:null,country:null,displayName:text,countryCode:null};
}

export function threadLocationText(location,fallback=null){
  const parts=locationParts(location??fallback);
  return parts.displayName??"—";
}

export function threadLocationTooltip(location,fallback=null){
  const parts=locationParts(location??fallback);
  return [parts.city,parts.country].filter(Boolean).join("/")||parts.displayName||"Unknown location";
}

export function threadLocationFlag(location,fallback=null){
  const parts=locationParts(location??fallback);
  return countryFlag(parts.countryCode);
}

export function createThreadLocation(location,{fallback=null,className="",showText=true,suffix=null}={}){
  const parts=locationParts(location??fallback);
  const wrap=document.createElement("span");
  wrap.className=["thread-location",className].filter(Boolean).join(" ");
  const tooltip=[parts.city,parts.country].filter(Boolean).join("/")||parts.displayName||"Unknown location";
  wrap.title=tooltip;

  if(parts.country||parts.countryCode){
    const flag=document.createElement("span");
    flag.className="thread-location-flag";
    flag.textContent=countryFlag(parts.countryCode)||"⚑";
    flag.setAttribute("aria-hidden","true");
    wrap.append(flag);
  }
  if(showText){
    const text=document.createElement("span");
    text.className="thread-location-text";
    text.textContent=parts.displayName??"—";
    wrap.append(text);
  }
  if(suffix!==null&&suffix!==undefined){
    const tail=document.createElement("span");
    tail.className="thread-location-suffix";
    tail.textContent=String(suffix);
    wrap.append(tail);
  }
  return wrap;
}

async function resolveThreadPortrait(threadId){
  if(portraitCache.has(threadId))return portraitCache.get(threadId);
  const pending=(async()=>{
    try{
      const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/identity",{
        headers:{Accept:"application/json"},
        cache:"no-store",
      });
      if(!response.ok)return null;
      const payload=await response.json();
      return preferredThreadPortraitUrl(payload?.identity);
    }catch{
      return null;
    }
  })();
  portraitCache.set(threadId,pending);
  const url=await pending;
  if(url===null&&portraitCache.get(threadId)===pending)portraitCache.delete(threadId);
  return url;
}

function applyPortrait(face,url,name){
  face.replaceChildren();
  face.dataset.portraitUrl=url??"";
  setPortraitPreviewSource(face,{url,name});
  delete face.dataset.lightboxSrc;
  delete face.dataset.lightboxAlt;
  if(!url){
    face.textContent=threadInitials(name);
    return;
  }
  const image=document.createElement("img");
  image.src=url;
  image.alt=(name??"Thread")+" portrait";
  image.loading="lazy";
  face.dataset.lightboxSrc=url;
  face.dataset.lightboxAlt=image.alt;
  face.append(image);
  image.addEventListener("error",()=>{
    hidePortraitPreview();
    applyPortrait(face,null,name);
  },{once:true});
}

async function hydrateThreadPortrait(face){
  const threadId=face?.dataset?.threadId;
  if(!threadId||!face.isConnected)return;
  const url=await resolveThreadPortrait(threadId);
  if(!face.isConnected||face.dataset.threadId!==threadId)return;
  applyPortrait(face,url,face.dataset.threadName||null);
}

const portraitObserver=typeof IntersectionObserver==="function"
  ?new IntersectionObserver((entries)=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        portraitObserver.unobserve(entry.target);
        void hydrateThreadPortrait(entry.target);
      }
    },{rootMargin:"160px 0px"})
  :null;

export function forgetThreadPortrait(threadId){
  portraitCache.delete(threadId);
}

export async function threadPortraitUrl(threadId){
  return resolveThreadPortrait(threadId);
}

export async function refreshThreadPortraitUrl(threadId){
  forgetThreadPortrait(threadId);
  return resolveThreadPortrait(threadId);
}

export function createThreadPortrait({threadId,name=null,url=null,className="",link=true}={}){
  const tag=link?"button":"span";
  const face=document.createElement(tag);
  if(link)face.type="button";
  face.className=["thread-person-face",link?"thread-link":"",className].filter(Boolean).join(" ");
  face.dataset.threadId=threadId??"";
  face.dataset.threadName=name??"";
  face.title=link
    ?"Open "+(name??threadId??"Thread")+" in Thread Observatory"
    :(name??threadId??"Thread")+" portrait";
  bindPortraitPreview(face,{url,name});
  applyPortrait(face,url,name);
  if(!url&&threadId){
    if(portraitObserver)portraitObserver.observe(face);
    else void hydrateThreadPortrait(face);
  }
  return face;
}

export function createThreadIdentityViewer({threadId,name=null,url=null,compact=false,className="",title=null}={}){
  const wrapper=document.createElement("div");
  wrapper.className=["thread-person-viewer",compact?"compact":"",className].filter(Boolean).join(" ");
  if(title)wrapper.title=title;

  const copy=document.createElement("div");
  copy.className="thread-person-copy";
  const nameButton=document.createElement("button");
  nameButton.type="button";
  nameButton.className="thread-person-name thread-link";
  nameButton.dataset.threadId=threadId;
  nameButton.textContent=name??threadId??"Thread";
  nameButton.title="Open "+(name??threadId??"Thread")+" in Thread Observatory";
  const id=document.createElement("small");
  id.className="mono";
  id.textContent=threadId??"—";
  copy.append(nameButton,id);

  wrapper.append(createThreadPortrait({threadId,name,url,link:true}),copy);
  return wrapper;
}

if(typeof window!=="undefined"){
  window.addEventListener("scroll",hideThreadPortraitPreview,true);
  window.addEventListener("resize",hideThreadPortraitPreview);
}
