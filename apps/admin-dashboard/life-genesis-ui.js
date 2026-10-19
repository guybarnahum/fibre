import {genesisExecutionEvidence} from "./life-genesis-model.mjs";

const el=(tag,cls=null,text=null)=>{
  const item=document.createElement(tag);
  if(cls)item.className=cls;
  if(text!==null)item.textContent=String(text);
  return item;
};
const time=value=>value&&Number.isFinite(Date.parse(value))
  ?new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})
  :"Not recorded";
const getJson=async url=>{
  const response=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(body?.detail??body?.error?.message
    ??body?.error?.code??body?.error??"HTTP "+response.status);
  return body;
};

export function renderGenesisExecutionPage(requestId){
  document.title="Fibre Admin · Birth execution";
  for(const selector of [".metrics",".filters-panel",".activity-view-panel",
    ".activity-pager","#appearance-view"]){
    const target=document.querySelector(selector);
    if(target)target.hidden=true;
  }
  document.querySelector(".crumbs")?.lastElementChild?.replaceChildren("Birth execution");
  for(const link of document.querySelectorAll(".nav-item")){
    link.classList.toggle("active",link.getAttribute("href")==="/activity?mode=birth-center");
  }
  const heading=document.querySelector(".page-head");
  heading.replaceChildren();
  const intro=el("div");
  intro.append(el("p","eyebrow","Genesis · execution, not childhood"),
    el("h1",null,"Birth execution"),
    el("p","lede","Birth Center's actual candidate state, recovery and World-admission evidence."));
  heading.append(intro);

  const main=document.querySelector(".main");
  const workspace=el("section","panel life-causes-workspace");
  const back=el("a","button-link secondary","← Birth Center");
  back.href="/activity?mode=birth-center";
  workspace.append(back);
  const summary=el("div","life-causes-summary");
  const layout=el("div","life-causes-layout");
  const history=el("section","life-causes-timeline");
  const details=el("section","life-causes-inspector");
  layout.append(history,details);
  workspace.append(summary,layout);
  main.append(workspace);

  function section(title,rows){
    const part=el("section","life-causes-part");
    part.append(el("h3",null,title));
    for(const [label,value] of rows.filter(([_,v])=>v!==null&&v!==undefined&&v!=="")){
      const row=el("p");
      row.append(el("strong",null,label+" · "),el("span",null,String(value)));
      part.append(row);
    }
    details.append(part);
  }

  (async()=>{
    try{
      // Both lists have bounded retention; a miss never proves that no
      // candidate ever existed. The request-specific development inspection
      // is exact when that development request has been reserved.
      const [pendingResult,stillbornResult,inspectionResult]=await Promise.allSettled([
        getJson("/api/threads/births/pending"),
        getJson("/api/threads/births/stillborn"),
        getJson("/api/threads/births/develop/"+encodeURIComponent(requestId)+"/inspection"),
      ]);
      if(pendingResult.status==="rejected"&&stillbornResult.status==="rejected"
        &&inspectionResult.status==="rejected"){
        throw new Error("No Birth Center source could be inspected.");
      }
      const pending=pendingResult.status==="fulfilled"
        ?pendingResult.value.births??[]:[];
      const stillborn=stillbornResult.status==="fulfilled"
        ?stillbornResult.value.births??[]:[];
      const inspection=inspectionResult.status==="fulfilled"
        ?inspectionResult.value.inspection??null:null;
      const evidence=genesisExecutionEvidence({requestId,pending,stillborn,inspection});
      summary.replaceChildren(el("strong",null,requestId),
        el("span",null,"Read-only · Birth Center authority"));
      if(evidence.state==="not_in_bounded_lists"){
        summary.append(el("p","life-causes-muted",
          "This request was not found in the available bounded Birth Center lists or development inspection. Its absence is not a publication verdict."));
      }

      history.replaceChildren(el("h2",null,"Execution milestones"),
        el("p","life-causes-muted","Observed steps, not a reconstructed call tree."));
      const rail=el("div","life-causes-spine");
      const record=evidence.source;
      const steps=[
        {at:record?.requestedAt??evidence.inspection?.requestedAt,
          label:"Birth requested",observed:Boolean(record||inspection)},
        {at:record?.createdAt??evidence.inspection?.requestedAt,
          label:"Candidate record observed",observed:Boolean(record||inspection)},
        {at:record?.updatedAt,
          label:"Last recorded progress · "+(evidence.currentStage??evidence.status??"unspecified"),
          observed:Boolean(record?.updatedAt)},
        {at:stillborn.find(item=>item.requestId===requestId)?.settledAt,
          label:"World-confirmed stillborn",observed:evidence.state==="stillborn"},
      ];
      if(evidence.publication==="birth_center_confirmed_born"){
        steps.push({at:evidence.inspection?.disposition?.settledAt??null,
          label:"Birth Center confirmed World admission",observed:true});
      }
      for(const step of steps.filter(x=>x.observed)){
        const item=el("div","life-genesis-step");
        item.append(el("small",null,time(step.at)),el("strong",null,step.label));
        rail.append(item);
      }
      if(!rail.children.length)rail.append(el("p","life-causes-muted",
        "No timestamped development steps are available."));
      history.append(rail);

      details.replaceChildren(el("h2",null,"Birth Center evidence"));
      section("Candidate state",[
        ["Observed state",evidence.state.replaceAll("_"," ")],
        ["Current stage (not proof of completion)",evidence.currentStage],
        ["Request status",evidence.status],
        ["Genesis",evidence.genesisId],
        ["Provisional Thread ID",evidence.threadId],
        ["Birthplace",record?.location],
        ["Sex",record?.sex],
      ]);
      section("Progress and recovery",[
        ["Created",record?.createdAt?time(record.createdAt):null],
        ["Last update",record?.updatedAt?time(record.updatedAt):null],
        ["Classification",record?.classification],
        ["Reason / blocker",record?.staleReason],
        ["Failure code",evidence.failureCode],
        ["Failure detail",evidence.failure],
        ["Retryable",record?.failureRetryable===null?null:record?.failureRetryable],
        ["Provider invocations witnessed",inspection?.invocationCount],
        ["Provisional status",inspection?.provisionalStatus],
      ]);
      section("World admission",[
        ["Finding",evidence.publication==="world_confirmed_not_admitted"
          ?"World confirmed no Thread was admitted for this stillborn request."
          :evidence.publication==="birth_center_confirmed_born"
            ?"Birth Center reconciled this request as born."
            :"Not established by the inspected candidate evidence."],
        ["Memory/meaning admission","Not reported by this candidate inspection; stage status is not a substitute."],
      ]);
      if(evidence.publication==="birth_center_confirmed_born"&&evidence.threadId){
        const link=el("a","button-link secondary","Open published formative life ↗");
        link.href="/life?thread="+encodeURIComponent(evidence.threadId)+"&view=origins";
        details.append(link);
      }
      const activity=el("a","button-link secondary","Inspect raw request activity ↗");
      activity.href="/activity?kind=request&value="+encodeURIComponent(requestId)+"&mode=raw";
      details.append(activity);
      const refs=el("details","life-causes-evidence");
      refs.append(el("summary",null,"Source coverage and provenance"),
        el("p",null,"Pending-list witness: "+(pendingResult.status==="fulfilled"?"read":"unavailable")),
        el("p",null,"Stillborn-list witness: "+(stillbornResult.status==="fulfilled"?"read":"unavailable")),
        el("p",null,"Development inspection: "+(inspection?"found":"not returned")),
        el("p",null,"Birth Center lists retain bounded recent requests; a missing record does not establish lifetime absence."));
      if(inspection?.planDigest)refs.append(el("p",null,
        "Development plan digest: "+inspection.planDigest));
      details.append(refs);
    }catch(error){
      summary.replaceChildren(el("p","error-box",
        "Birth inspection unavailable: "+(error instanceof Error?error.message:String(error))));
    }
  })();
}
