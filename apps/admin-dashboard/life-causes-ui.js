import {fetchThreadObservatory,threadName} from "./thread-observatory.js";
import {recentLifeMoments} from "./life-causes-model.mjs";

const find=selector=>document.querySelector(selector);
const el=(tag,className=null,value=null)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==null)node.textContent=String(value);
  return node;
};
const timestamp=value=>value?new Date(value).toLocaleString(undefined,{
  dateStyle:"medium",timeStyle:"short",
}):"Time not established";

export function renderLifeCausesPage(){
  document.title="Fibre Admin · Life & Causes";
  for(const selector of [".metrics",".filters-panel",".activity-view-panel",
    ".activity-pager","#appearance-view"]){
    const item=find(selector);
    if(item)item.hidden=true;
  }
  find(".crumbs")?.lastElementChild?.replaceChildren("Life & Causes");
  for(const link of document.querySelectorAll(".nav-item")){
    link.classList.toggle("active",link.getAttribute("href")==="/life");
  }

  const head=find(".page-head");
  head.replaceChildren();
  const intro=el("div");
  intro.append(el("p","eyebrow","Life Observatory"),
    el("h1",null,"Life & Causes"),
    el("p","lede","Follow a person's enacted life; investigate decisions without inventing their motives."));
  head.append(intro);

  const surface=el("section","panel life-causes-workspace");
  const selector=el("form","life-causes-subject");
  const label=el("label",null,"Thread");
  const input=el("input");input.name="thread";input.placeholder="thr_…";
  input.setAttribute("aria-label","Thread ID");
  input.autocomplete="off";
  label.append(input);
  const inspect=el("button","primary","Inspect life");
  inspect.type="submit";
  const choose=el("a","button-link secondary","Choose from Threads ↗");
  choose.href="/activity?mode=threads";
  selector.append(label,inspect,choose);
  const summary=el("div","life-causes-summary");
  const detail=el("div","life-causes-layout");
  const timeline=el("section","life-causes-timeline");
  const moment=el("section","life-causes-inspector");
  timeline.append(el("h2",null,"Recent enacted life"));
  moment.append(el("h2",null,"Selected moment"));
  detail.append(timeline,moment);
  surface.append(selector,summary,detail);
  find(".main").append(surface);

  const notice=(target,message)=>{target.replaceChildren(el("p","life-causes-muted",message));};
  let loaded=null,selected=null,sequence=0;
  function selectedMoment(item){
    selected=item;
    const next=new URL(location.href);
    if(item===null)next.searchParams.delete("situation");
    else next.searchParams.set("situation",item.id);
    history.replaceState(null,"",next);
    redraw();
  }
  function redraw(){
    const moments=loaded?.moments??[];
    timeline.replaceChildren(el("h2",null,"Recent enacted life"));
    if(!loaded){
      notice(timeline,"Choose a Thread to inspect its recorded life.");
      notice(moment,"Select a World-enacted moment to inspect the evidence.");
      return;
    }
    timeline.append(el("p","life-causes-muted",
      "Up to eight recent situations · not a lifetime history."));
    if(!moments.length)timeline.append(el("p","life-causes-muted",
      "No enacted situations were returned in this bounded view."));
    for(const item of moments){
      const card=el("button","life-causes-moment");
      card.type="button";
      card.classList.toggle("selected",item.id===selected?.id);
      const when=el("time",null,timestamp(item.at));
      const title=el("strong",null,item.activity
        ??(item.phase==="in_transit"?"Travel":"Enacted situation"));
      const context=el("small",null,
        (item.phase==="at_place"?"At place"
          :item.phase==="in_transit"?"In transit":"World-enacted")+
        (item.planned?" · linked Flight Plan":""));
      card.append(when,title,context);
      card.addEventListener("click",()=>selectedMoment(item));
      timeline.append(card);
    }
    moment.replaceChildren(el("h2",null,"Selected moment"));
    if(!selected){notice(moment,"Choose a moment from the timeline.");return;}
    const top=el("div","life-causes-moment-heading");
    top.append(el("strong",null,selected.activity??"Enacted situation"),
      el("span",null,timestamp(selected.at)));
    moment.append(top);
    const part=(title,lines)=>{
      const block=el("section","life-causes-part");
      block.append(el("h3",null,title));
      for(const line of lines)block.append(el("p",null,line));
      moment.append(block);
    };
    part("Before · conditions",[
      "Planning-time Body pressure, City Guide exposure and selected memories are not captured in this current-life view.",
      selected.planned
        ?"Linked Thread-authored plan · "+timestamp(selected.planned.authoredAt)
        :"No Flight Plan link has been established for this situation in the bounded view.",
    ]);
    part("Decision · intention",selected.planned?[
      selected.planned.purpose?"Stated purpose: "+selected.planned.purpose:
        "No specific purpose was retained for the matched plan stop.",
      selected.planned.activity?"Planned activity: "+selected.planned.activity:""
    ].filter(Boolean):["A World situation is not by itself evidence of what motivated it."]);
    part("World · what happened",[
      (selected.phase==="at_place"?"Presence was enacted"
        :selected.phase==="in_transit"?"Travel was enacted"
        :"The situation was admitted")+" at "+timestamp(selected.at)+".",
      selected.placeKind==="verified_public"
        ?"This situation references a World public-place identity."
        :selected.placeKind==="private_or_unverified"
          ?"The setting is private or not independently verified as a public venue."
          :"No verified physical venue is established in this selected record.",
    ]);
    part("After · consequences",[
      "Social interaction, attention, Experience and retained Memory are not inspected in this current-only view.",
      "Later occurrence does not by itself demonstrate causal influence.",
    ]);
    const link=el("a","button-link secondary","Open Thread details ↗");
    link.href="/thread/"+encodeURIComponent(loaded.threadId);
    moment.append(link);
    const evidence=el("details","life-causes-evidence");
    evidence.append(el("summary",null,"Evidence references"),
      el("p",null,"CurrentSituation: "+selected.id),
      el("p",null,"Flight Plan: "+(selected.planned?.planId??"not linked")));
    moment.append(evidence);
  }
  async function openThread(threadId,situationId=null){
    const invocation=++sequence;
    summary.replaceChildren(el("p","life-causes-muted","Reading current World life…"));
    loaded=null;selected=null;redraw();
    try{
      const result=await fetchThreadObservatory(threadId,{currentOnly:true});
      if(invocation!==sequence)return;
      if(result.encounterError)throw new Error("Current World life unavailable: "+result.encounterError);
      const moments=recentLifeMoments(result.livedNow);
      loaded={threadId,moments};
      summary.replaceChildren(
        el("strong",null,threadName(result.identity)??threadId),
        el("span",null,"Read-only · current World snapshot · no Thread wake or life mutation"),
      );
      selected=moments.find(item=>item.id===situationId)??moments[0]??null;
      redraw();
    }catch(error){
      if(invocation!==sequence)return;
      summary.replaceChildren(el("p","error-box",
        "Could not inspect this Thread: "+(error instanceof Error?error.message:String(error))));
      loaded=null;redraw();
    }
  }
  selector.addEventListener("submit",event=>{
    event.preventDefault();
    const threadId=input.value.trim();
    if(!/^thr_[a-zA-Z0-9]+$/u.test(threadId)){
      notice(summary,"Enter a valid Thread ID or select a person from Threads.");
      return;
    }
    const next=new URL(location.href);
    next.searchParams.set("thread",threadId);
    next.searchParams.delete("situation");
    history.pushState(null,"",next);
    void openThread(threadId);
  });
  const params=new URLSearchParams(location.search);
  const threadId=params.get("thread");
  if(threadId!==null&&/^thr_[a-zA-Z0-9]+$/u.test(threadId)){
    input.value=threadId;
    void openThread(threadId,params.get("situation"));
  }else redraw();
}
