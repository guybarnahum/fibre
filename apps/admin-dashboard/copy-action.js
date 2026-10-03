import {decorateActionButton} from "./fa-icons.js";

function copyText(value){
  return typeof value==="string"?value:JSON.stringify(value,null,2);
}

export async function writeClipboard(value,{
  clipboard=globalThis.navigator?.clipboard,
  documentRef=globalThis.document,
}={}){
  const text=copyText(value);
  if(clipboard?.writeText){
    try{
      await clipboard.writeText(text);
      return true;
    }catch{
      if(!documentRef?.createElement)throw new Error("Clipboard copy failed");
    }
  }
  if(!documentRef?.createElement)throw new Error("Clipboard is unavailable");
  const area=documentRef.createElement("textarea");
  area.value=text;
  area.setAttribute("readonly","");
  area.style.position="fixed";
  area.style.opacity="0";
  documentRef.body.append(area);
  area.select();
  const copied=documentRef.execCommand("copy");
  area.remove();
  if(!copied)throw new Error("Clipboard copy failed");
  return true;
}

export function decorateCopyAction(button,{
  label,
  tooltip=label,
  iconOnly=true,
}={}){
  return decorateActionButton(button,{icon:"copy",label,tooltip,iconOnly});
}

export async function copyWithFeedback(button,value,{
  label,
  tooltip=label,
  iconOnly=true,
  copiedLabel="Copied",
  copiedTooltip=copiedLabel,
  failedLabel="Copy failed",
  failedTooltip=failedLabel,
  resetMs=1200,
}={}){
  if(!button)throw new TypeError("copy button is required");
  let copied=false;
  try{
    await writeClipboard(value);
    copied=true;
    decorateCopyAction(button,{label:copiedLabel,tooltip:copiedTooltip,iconOnly});
  }catch(error){
    decorateCopyAction(button,{
      label:failedLabel,
      tooltip:failedTooltip==="Copy failed"&&error instanceof Error
        ?failedTooltip+": "+error.message
        :failedTooltip,
      iconOnly,
    });
  }
  globalThis.setTimeout?.(()=>decorateCopyAction(button,{label,tooltip,iconOnly}),resetMs);
  return copied;
}

export function bindCopyAction(button,{
  value,
  label,
  tooltip=label,
  iconOnly=true,
  copiedLabel="Copied",
  copiedTooltip=copiedLabel,
  failedLabel="Copy failed",
  failedTooltip=failedLabel,
  resetMs=1200,
  preventDefault=false,
  stopPropagation=false,
}={}){
  if(!button)throw new TypeError("copy button is required");
  decorateCopyAction(button,{label,tooltip,iconOnly});
  button.addEventListener("click",async(event)=>{
    if(preventDefault)event.preventDefault();
    if(stopPropagation)event.stopPropagation();
    try{
      const resolved=typeof value==="function"?await value():value;
      await copyWithFeedback(button,resolved,{
        label,tooltip,iconOnly,copiedLabel,copiedTooltip,failedLabel,failedTooltip,resetMs,
      });
    }catch(error){
      decorateCopyAction(button,{
        label:failedLabel,
        tooltip:error instanceof Error?failedTooltip+": "+error.message:failedTooltip,
        iconOnly,
      });
      globalThis.setTimeout?.(()=>decorateCopyAction(button,{label,tooltip,iconOnly}),resetMs);
    }
  });
  return button;
}
