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
  button.classList.add("copy-action");
  return decorateActionButton(button,{icon:"copy",label,tooltip,iconOnly});
}

const feedbackTimers=new WeakMap();

// Feedback is an overlay; the existing icon and label never change size or position.
function showCopyFeedback(button,{state,message,tooltip,label,originalTooltip,resetMs}){
  const previous=feedbackTimers.get(button);
  if(previous!==undefined)globalThis.clearTimeout?.(previous);
  button.dataset.copyFeedback=message;
  button.dataset.copyFeedbackState=state;
  button.title=tooltip;
  button.dataset.tooltip=tooltip;
  button.setAttribute("aria-label",tooltip);
  const timer=globalThis.setTimeout?.(()=>{
    delete button.dataset.copyFeedback;
    delete button.dataset.copyFeedbackState;
    button.title=originalTooltip;
    button.dataset.tooltip=originalTooltip;
    button.setAttribute("aria-label",label);
    feedbackTimers.delete(button);
  },resetMs);
  if(timer!==undefined)feedbackTimers.set(button,timer);
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
  try{
    await writeClipboard(value);
    showCopyFeedback(button,{state:"success",message:copiedLabel,
      tooltip:copiedTooltip,label,originalTooltip:tooltip,resetMs});
    return true;
  }catch(error){
    showCopyFeedback(button,{state:"failed",message:failedLabel,
      tooltip:failedTooltip==="Copy failed"&&error instanceof Error
        ?failedTooltip+": "+error.message:failedTooltip,
      label,originalTooltip:tooltip,resetMs});
    return false;
  }
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
      showCopyFeedback(button,{state:"failed",message:failedLabel,
        tooltip:error instanceof Error?failedTooltip+": "+error.message:failedTooltip,
        label,originalTooltip:tooltip,resetMs});
    }
  });
  return button;
}
