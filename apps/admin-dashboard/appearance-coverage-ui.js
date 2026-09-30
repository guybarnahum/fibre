import { decorateActionButton, setWaitingContent } from "./fa-icons.js";
import { WORLD_MAP_PATH } from "./world-map-data.js";
import { SVG_NS, renderWorldTimeZoneLines, worldMapPoint } from "./world-map-ui.js";

const $=(selector)=>document.querySelector(selector);
const view=$("#appearance-view");
const rows=$("#appearance-hole-rows");
const detail=$("#appearance-hole-detail");
const modelRows=$("#appearance-model-rows");
const migrations=$("#appearance-migration-candidates");
const worldPath=$("#appearance-world-path");
const timezones=$("#appearance-timezones");
const markers=$("#appearance-hole-markers");
const mapSummary=$("#appearance-map-summary");
const scanButton=$("#appearance-scan");

let snapshot=null;
let selectedKey=null;
let loading=false;

function el(tag,className,text=null){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}

function human(value){
  return String(value??"").replace(/[_-]+/gu," ").replace(/\b\w/gu,(c)=>c.toUpperCase());
}

function coverageTone(value){
  return value==="missing"||value==="fallback"?"bad":value==="broad"?"warn":value==="partial"?"warn":"good";
}

function chainText(calibration){
  const chain=calibration?.dependencyChain;
  if(!Array.isArray(chain)||chain.length===0)return "—";
  return chain.map(({id,version})=>`${id}@${version}`).join(" → ");
}

function threadLink(threadId,name=null){
  const node=el("button","appearance-thread-link thread-link",name??threadId);
  node.type="button";
  node.dataset.threadId=threadId;
  node.title=`Inspect ${threadId}`;
  return node;
}

function actionSpec(kind,hole){
  return Object.freeze({
    contract:"fibre-population-lab-action-v0.1",
    action:kind,
    coverageKey:hole.key,
    referencePopulation:hole.referencePopulation,
    coverage:hole.coverage,
    populations:hole.populations,
    threadIds:hole.threadIds,
    places:hole.places,
    calibration:hole.calibration,
    requestedAt:new Date().toISOString(),
  });
}

async function copyJson(value,button){
  const text=JSON.stringify(value,null,2);
  try{
    await navigator.clipboard.writeText(text);
    decorateActionButton(button,{icon:"copy",label:"Copied",tooltip:"Copied Population Lab action"});
  }catch{
    const area=document.createElement("textarea");
    area.value=text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    decorateActionButton(button,{icon:"copy",label:"Copied",tooltip:"Copied Population Lab action"});
  }
  setTimeout(()=>decorateActionButton(button,{icon:"copy",label:"Copy JSON",tooltip:"Copy action JSON"}),1200);
}

function renderPreparedAction(kind,hole){
  const existing=detail.querySelector(".appearance-prepared-action");
  existing?.remove();
  const panel=el("div","appearance-prepared-action");
  const title=kind==="experiment"?"Population Lab experiment":"Research request";
  panel.append(el("strong",null,`${title} prepared`));
  panel.append(el("p",null,
    kind==="experiment"
      ?"This spec is ready for the Population Lab runner. A1 does not execute image/provider work from the dashboard."
      :"This spec is ready for the research adapter. Research may propose calibration evidence but cannot mutate the model."
  ));
  const spec=actionSpec(kind,hole);
  const pre=el("pre","appearance-action-json",JSON.stringify(spec,null,2));
  const copy=el("button","secondary");
  copy.type="button";
  decorateActionButton(copy,{icon:"copy",label:"Copy JSON",tooltip:"Copy action JSON"});
  copy.addEventListener("click",()=>void copyJson(spec,copy));
  panel.append(copy,pre);
  detail.append(panel);
}

function renderDetail(){
  const hole=snapshot?.holes?.find((item)=>item.key===selectedKey)??snapshot?.holes?.[0]??null;
  if(hole===null){
    detail.replaceChildren(el("div","empty","No coverage holes in the current Thread population."));
    return;
  }
  selectedKey=hole.key;
  detail.replaceChildren();

  const head=el("div","appearance-hole-detail-head");
  const title=el("div");
  title.append(el("p","eyebrow",human(hole.coverage)),el("h3",null,hole.referencePopulation??"Missing ancestry provenance"));
  const tag=el("span",`thread-health-tag ${coverageTone(hole.coverage)}`,human(hole.coverage));
  head.append(title,tag);

  const facts=el("div","appearance-hole-facts");
  const fact=(label,value)=>{
    const node=el("div");
    node.append(el("span",null,label),el("strong",null,String(value??"—")));
    return node;
  };
  facts.append(
    fact("Threads",hole.threadCount),
    fact("Parental sides",hole.sides),
    fact("Weighted demand",hole.weightedSides),
    fact("Version",hole.calibration?.version??"—"),
  );

  const chain=el("p","appearance-calibration-chain",`Calibration: ${chainText(hole.calibration)}`);
  const populations=el("p","appearance-hole-populations",`Recorded families: ${hole.populations?.join(" · ")||"—"}`);

  const threads=el("div","appearance-thread-chips");
  for(const threadId of hole.threadIds??[])threads.append(threadLink(threadId));

  const places=el("div","appearance-place-list");
  for(const place of (hole.places??[]).slice(0,10)){
    places.append(el("span","appearance-place-chip",`${place.displayName??[place.city,place.country].filter(Boolean).join(", ")} · ${place.count}`));
  }

  const actions=el("div","thread-repair-actions");
  const experiment=el("button","secondary");
  experiment.type="button";
  decorateActionButton(experiment,{icon:"flask",label:"Prepare experiment",tooltip:"Prepare a bounded Population Lab experiment for this coverage hole"});
  experiment.addEventListener("click",()=>renderPreparedAction("experiment",hole));
  const research=el("button","secondary");
  research.type="button";
  decorateActionButton(research,{icon:"magnifying-glass",label:"Prepare research",tooltip:"Prepare an evidence-research request for this coverage hole"});
  research.addEventListener("click",()=>renderPreparedAction("research",hole));
  actions.append(experiment,research);

  detail.append(head,facts,chain,populations,threads,places,actions);
}

function renderHoles(){
  rows.replaceChildren();
  for(const hole of snapshot?.holes??[]){
    const tr=document.createElement("tr");
    tr.classList.toggle("selected",hole.key===selectedKey);
    tr.tabIndex=0;
    const ref=el("td",null,hole.referencePopulation??"Missing provenance");
    const state=el("td");
    state.append(el("span",`thread-health-tag ${coverageTone(hole.coverage)}`,human(hole.coverage)));
    const threads=el("td",null,hole.threadCount);
    const sides=el("td",null,hole.sides);
    const priority=el("td",null,hole.priority);
    tr.append(ref,state,threads,sides,priority);
    const select=()=>{
      selectedKey=hole.key;
      renderHoles();
      renderDetail();
    };
    tr.addEventListener("click",select);
    tr.addEventListener("keydown",(event)=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      event.preventDefault();
      select();
    });
    rows.append(tr);
  }
}

function renderModel(){
  modelRows.replaceChildren();
  for(const item of snapshot?.model??[]){
    const tr=document.createElement("tr");
    tr.append(
      el("td","mono",item.id),
      el("td",null,item.version),
      el("td","mono",item.parent??"—"),
      el("td",null,item.status),
      el("td",null,item.ownAxes?.length??0),
      el("td","mono",item.populationIds?.join(", ")||"—"),
    );
    modelRows.append(tr);
  }
}

function renderMigrations(){
  migrations.replaceChildren();
  const candidates=snapshot?.migrationCandidates??[];
  if(candidates.length===0){
    migrations.append(el("p","thread-repair-note","No admitted Thread with durable ancestry evidence is stale against the current versioned calibration dependencies."));
    return;
  }
  for(const candidate of candidates){
    const row=el("div","appearance-migration-row");
    const identity=el("div");
    identity.append(threadLink(candidate.threadId,candidate.threadName??candidate.threadId));
    identity.append(el("span",null,human(candidate.reason)));
    const changes=el("div","appearance-migration-changes");
    for(const change of candidate.changes??[]){
      const from=change.from?.dependencyChain?.at(-1);
      const to=change.to?.dependencyChain?.at(-1);
      changes.append(el("span",null,`${from?`${from.id}@${from.version}`:"unversioned"} → ${to?`${to.id}@${to.version}`:"removed"}`));
    }
    row.append(identity,changes);
    migrations.append(row);
  }
}

function renderMap(){
  if(!worldPath||!markers||!timezones)return;
  worldPath.setAttribute("d",WORLD_MAP_PATH);
  renderWorldTimeZoneLines(timezones);
  markers.replaceChildren();
  let points=0;
  for(const hole of snapshot?.holes??[]){
    for(const place of hole.places??[]){
      if(!Number.isFinite(Number(place.lat))||!Number.isFinite(Number(place.long)))continue;
      const point=worldMapPoint(Number(place.lat),Number(place.long));
      const circle=document.createElementNS(SVG_NS,"circle");
      circle.setAttribute("cx",point.x.toFixed(1));
      circle.setAttribute("cy",point.y.toFixed(1));
      circle.setAttribute("r",String(Math.min(12,4+Math.sqrt(place.count??1)*2)));
      circle.classList.add("appearance-hole-marker",`coverage-${hole.coverage}`);
      circle.setAttribute("tabindex","0");
      circle.setAttribute("role","button");
      circle.setAttribute("aria-label",`${hole.referencePopulation??"Missing provenance"} at ${place.displayName??place.city??"represented place"}`);
      const select=()=>{
        selectedKey=hole.key;
        renderHoles();
        renderDetail();
      };
      circle.addEventListener("click",select);
      circle.addEventListener("keydown",(event)=>{
        if(event.key!=="Enter"&&event.key!==" ")return;
        event.preventDefault();
        select();
      });
      markers.append(circle);
      points+=1;
    }
  }
  mapSummary.textContent=points===0
    ?"No geocoded coverage holes in the current scan."
    :`${points} represented hole location${points===1?"":"s"} · geography shows demand context, never inferred ancestry.`;
}

export function renderAppearanceCoverage(payload){
  snapshot=payload;
  if(!selectedKey||!(payload.holes??[]).some((hole)=>hole.key===selectedKey))selectedKey=payload.holes?.[0]?.key??null;
  $("#appearance-stat-threads").textContent=payload.threadCount??0;
  $("#appearance-stat-lineages").textContent=payload.lineageCount??0;
  $("#appearance-stat-holes").textContent=payload.holes?.length??0;
  $("#appearance-stat-migrations").textContent=payload.migrationCandidates?.length??0;
  $("#appearance-stat-fallback").textContent=(payload.coverage?.fallback??0)+(payload.coverage?.missing??0);
  renderHoles();
  renderDetail();
  renderModel();
  renderMigrations();
  renderMap();
}

export function appearanceCoverageTopSummary(payload=snapshot){
  return Object.freeze({
    holes:payload?.holes?.length??0,
    migrations:payload?.migrationCandidates?.length??0,
    lineages:payload?.lineageCount??0,
  });
}

export async function loadAppearanceCoverage(){
  if(loading)return snapshot;
  loading=true;
  scanButton.disabled=true;
  decorateActionButton(scanButton,{icon:"rotate",label:"Scanning",tooltip:"Scanning appearance coverage",spinning:true});
  try{
    const response=await fetch("/api/appearance/coverage",{headers:{Accept:"application/json"},cache:"no-store"});
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??`HTTP ${response.status}`);
    renderAppearanceCoverage(payload);
    return payload;
  }finally{
    loading=false;
    scanButton.disabled=false;
    scanButton.textContent="Scan coverage";
  }
}

scanButton?.addEventListener("click",()=>void loadAppearanceCoverage());
