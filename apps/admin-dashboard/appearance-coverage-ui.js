import { bindCopyAction, copyWithFeedback, decorateCopyAction } from "./copy-action.js";
import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { watchAdminLive } from "./admin-live.js";
import { decorateActionButton, setBlockingButtonState, setRefreshButtonState } from "./fa-icons.js";
import {
  createThreadIdentityViewer,
  createThreadLocation,
} from "./thread-person-ui.js";
import {
  postThreadAppearanceRepair,
  requestThreadAppearanceHealth,
  threadAppearanceState,
} from "./thread-appearance-ui.js";
import { createStarRating, starRatingValue } from "./star-rating.js";
import { threadViewKey } from "./view-invalidation.js";
import { WORLD_MAP_PATH } from "./world-map-data.js";
import { SVG_NS, renderWorldTimeZoneLines, worldMapPoint } from "./world-map-ui.js";

const $=(selector)=>document.querySelector(selector);
const rows=$("#appearance-hole-rows");
const detail=$("#appearance-hole-detail");
const modelRows=$("#appearance-model-rows");
const migrations=$("#appearance-migration-candidates");
const migrateAllButton=$("#appearance-migrate-all");
const experiments=$("#appearance-experiments");
const experimentRefreshButton=$("#appearance-experiments-refresh");
const reportDialog=$("#appearance-report-dialog");
const reportTitle=$("#appearance-report-title");
const reportFrame=$("#appearance-report-frame");
const reportNewTab=$("#appearance-report-new-tab");
const reportClose=$("#appearance-report-close");
const reportReview=$("#appearance-report-review");
const shadowDialog=$("#appearance-shadow-dialog");
const shadowClose=$("#appearance-shadow-close");
const shadowCancel=$("#appearance-shadow-cancel");
const shadowRun=$("#appearance-shadow-run");
const shadowContext=$("#appearance-shadow-context");
const shadowRationale=$("#appearance-shadow-rationale");
const shadowEvidence=$("#appearance-shadow-evidence");
const shadowValues=$("#appearance-shadow-values");
const shadowVariation=$("#appearance-shadow-variation");
const mapShell=$(".appearance-coverage-map-shell");
const worldPath=$("#appearance-world-path");
const timezones=$("#appearance-timezones");
const markers=$("#appearance-hole-markers");
const mapSummary=$("#appearance-map-summary");
const scanButton=$("#appearance-scan");
const copyButton=$("#appearance-copy");

let snapshot=null;
let selectedKey=null;
let loadPromise=null;
let experimentLoadPromise=null;
let experimentSnapshot=[];
let shadowBaseExperiment=null;
let mapPopover=null;
let mapPopoverCloseTimer=null;
const pendingMigrations=new Map();
const busyThreads=new Set();
let migrationBatch=null;

function el(tag,className,text=null){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}

function human(value){
  return String(value??"").replace(/([a-z0-9])([A-Z])/gu,"$1 $2").replace(/[_-]+/gu," ").replace(/\b\w/gu,(c)=>c.toUpperCase());
}

function coverageTone(value){
  return value==="missing"||value==="fallback"?"bad":value==="broad"||value==="partial"?"warn":"good";
}

function experimentStatus(status){
  if(status==="completed")return {label:"Experiment Defined",tone:"good",active:false};
  if(status==="failed")return {label:"Experiment Failed",tone:"bad",active:false};
  if(status==="running")return {label:"Experiment Running",tone:"warn",active:true};
  if(status==="queued")return {label:"Experiment Queued",tone:"warn",active:true};
  return {label:human(status??"unknown"),tone:"",active:false};
}

function visualStatus(status){
  if(!status)return null;
  if(status==="completed")return {label:"Images Generated",tone:"good",active:false};
  if(status==="failed")return {label:"Image Generation Failed",tone:"bad",active:false};
  if(["queued","running"].includes(status))return {label:"Generating Images",tone:"warn",active:true};
  return {label:human(status),tone:"",active:false};
}

function reviewStatus(review){
  if(review?.decision==="supports_candidate")return {label:"Review Supports Candidate",tone:"good",active:false};
  if(review?.decision==="reject")return {label:"Review Rejected",tone:"bad",active:false};
  if(review?.decision==="inconclusive")return {label:"Review Inconclusive",tone:"warn",active:false};
  return null;
}

function experimentStatusPill(state){
  return el("span",[
    "thread-health-tag",
    "appearance-experiment-status",
    state.tone,
    state.active?"is-active":"",
  ].filter(Boolean).join(" "),state.label);
}

function experimentSummary(experiment){
  const summary=experiment?.summary??{};
  const bits=[];
  if(Number.isInteger(summary.people))bits.push(summary.people+" people");
  if(Number.isInteger(summary.warnings))bits.push(summary.warnings+" warning"+(summary.warnings===1?"":"s"));
  if(Number.isInteger(summary.images)&&summary.images>0)bits.push(summary.images+" portraits");
  return bits.join(" · ")||"No summary yet";
}

function experimentReportUrl(experimentId){
  return "/api/appearance/experiments/"+encodeURIComponent(experimentId)+"/report";
}

function openExperimentReport(experiment){
  if(!reportDialog||!reportFrame)return;
  const url=experimentReportUrl(experiment.experimentId);
  const reference=experiment.visual?.summary?.referencePopulation??experiment.summary?.referencePopulation??experiment.experimentId;
  if(reportTitle)reportTitle.textContent=(experiment.visual?.status==="completed"?"Visual fidelity · ":"Experiment report · ")+reference;
  reportFrame.src=url;
  reportFrame.dataset.reportUrl=url;
  void loadVisualReview(experiment);
  if(!reportDialog.open)reportDialog.showModal();
}

function visualProgress(experiment){
  if(!experiment?.visual)return null;
  const sampleSize=Number.isInteger(experiment.visual.sampleSize)&&experiment.visual.sampleSize>0
    ? experiment.visual.sampleSize
    : 4;
  const images=Array.isArray(experiment.images)?experiment.images:[];
  const geometry=images.filter(image=>image?.role==="geometry").length;
  const portraits=images.filter(image=>image?.role==="portrait").length;
  return Object.freeze({
    sampleSize,
    geometry,
    portraits,
    completed:geometry+portraits,
    total:sampleSize*2,
  });
}


function reviewScoreSummary(review){
  const grid=el("div","appearance-review-score-summary");
  for(const [label,field] of [
    ["Geometry","geometryFidelity"],
    ["Identity","identityContinuity"],
    ["Surface","surfaceRealism"],
  ]){
    const item=el("div",null);
    item.append(el("span",null,label),el("strong",null,(review.scores?.[field]??"—")+"/5"));
    grid.append(item);
  }
  return grid;
}

async function rerunRejectedExperiment(experiment,button){
  if(!window.confirm("Keep this rejected experiment as evidence and launch a new experiment from the same source and calibration?"))return;
  setBlockingButtonState(button,true,{
    label:"Run another experiment",
    tooltip:"Run another experiment",
    busyLabel:"Launching",
    busyTooltip:"Launching a new experiment from the rejected evidence",
  });
  try{
    const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/rerun",{
      method:"POST",
      headers:{Accept:"application/json"},
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    await loadAppearanceExperiments();
    const note=el("p","appearance-review-note-readonly","New experiment queued · "+(payload?.experiment?.experimentId??"new experiment"));
    reportReview?.append(note);
    setBlockingButtonState(button,false,{
      label:"Run another experiment",
      tooltip:"New experiment queued",
      icon:"rotate",
    });
    button.disabled=true;
  }catch(error){
    setBlockingButtonState(button,false,{
      label:"Run another experiment",
      tooltip:error instanceof Error?error.message:String(error),
      icon:"rotate",
    });
  }
}

function scrollReportToSample(ordinal){
  const id="sample-"+String(ordinal).padStart(3,"0");
  const target=reportFrame?.contentDocument?.getElementById(id);
  if(target){
    target.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  const url=reportFrame?.dataset?.reportUrl;
  if(url)reportFrame.src=url+"#"+id;
}

function reviewSampleJump(experiment,ordinal){
  const jump=el("button","appearance-review-sample-jump");
  jump.type="button";
  jump.title="Show Sample "+ordinal+" in report";
  jump.setAttribute("aria-label","Show Sample "+ordinal+" in visual report");

  const thumb=document.createElement("img");
  thumb.className="appearance-review-sample-thumb";
  thumb.alt="";
  thumb.loading="lazy";
  thumb.src="/api/appearance/experiments/"
    +encodeURIComponent(experiment.experimentId)
    +"/image/"
    +String(ordinal).padStart(3,"0")
    +"/portrait";
  thumb.addEventListener("error",()=>thumb.remove(),{once:true});

  jump.append(thumb,el("strong",null,"Sample "+ordinal));
  jump.addEventListener("click",()=>scrollReportToSample(ordinal));
  return jump;
}

function renderSubmittedVisualReview(experiment,review){
  if(!reportReview)return;
  reportReview.replaceChildren();
  const head=el("div","appearance-review-head");
  head.append(
    el("h3",null,"Submitted human review"),
    el("p",null,"Immutable evidence for this exact A/B image set. It cannot change calibration authority by itself."),
  );
  const state=reviewStatus(review);
  if(state)head.append(experimentStatusPill(state));
  reportReview.append(head,reviewScoreSummary(review));

  for(const sample of review.samples??[]){
    const row=el("div","appearance-review-sample");
    row.append(
      reviewSampleJump(experiment,sample.ordinal),
      el("p","appearance-review-note-readonly",
        "Geometry "+sample.geometryFidelity+"/5 · Identity "+sample.identityContinuity+"/5 · Surface "+sample.surfaceRealism+"/5"),
    );
    if(sample.note)row.append(el("p","appearance-review-note-readonly",sample.note));
    reportReview.append(row);
  }
  if(review.note)reportReview.append(el("p","appearance-review-note-readonly",review.note));

  if(review.decision==="supports_candidate"){
    reportReview.append(el("p","appearance-review-note-readonly",
      "This review can support a calibration candidate. Research/proposed parameter changes and explicit approval are still required before the reference registry changes."));
  }else if(review.decision==="reject"){
    const actions=el("div","appearance-review-actions");
    const rerun=el("button","secondary");
    rerun.type="button";
    decorateActionButton(rerun,{
      icon:"rotate",
      label:"Run another experiment",
      tooltip:"Keep this rejected evidence and launch a new experiment from the same source",
    });
    rerun.addEventListener("click",()=>void rerunRejectedExperiment(experiment,rerun));
    actions.append(rerun);
    reportReview.append(actions);
  }else{
    reportReview.append(el("p","appearance-review-note-readonly",
      "Inconclusive evidence remains attached to this experiment; it does not support promotion or rejection."));
  }
}

function renderVisualReviewForm(experiment){
  if(!reportReview)return;
  reportReview.replaceChildren();
  const progress=visualProgress(experiment);
  const sampleSize=progress?.sampleSize??4;
  const head=el("div","appearance-review-head");
  head.append(
    el("h3",null,"Score visual fidelity"),
    el("p",null,"Score the A → B transition, not attractiveness or demographic identity. 1 = material failure · 3 = usable with visible drift · 5 = strong fidelity."),
  );
  reportReview.append(head);

  for(let ordinal=1;ordinal<=sampleSize;ordinal+=1){
    const sample=el("div","appearance-review-sample");
    sample.dataset.reviewOrdinal=String(ordinal);
    sample.append(reviewSampleJump(experiment,ordinal));
    const grid=el("div","appearance-review-grid");
    for(const [label,field] of [
      ["Geometry","geometryFidelity"],
      ["Identity","identityContinuity"],
      ["Surface","surfaceRealism"],
    ]){
      const fieldLabel=el("div","appearance-review-rating");
      fieldLabel.append(
        el("span",null,label),
        createStarRating({name:field,label:label+" score"}),
      );
      grid.append(fieldLabel);
    }
    sample.append(grid);
    reportReview.append(sample);
  }

  const decisionWrap=el("label","appearance-review-decision");
  const decision=el("select",null);
  decision.id="appearance-review-decision";
  decision.append(
    new Option("Choose…",""),
    new Option("Supports candidate","supports_candidate"),
    new Option("Inconclusive","inconclusive"),
    new Option("Reject","reject"),
  );
  decisionWrap.append(el("span",null,"Overall decision"),decision);

  const note=el("textarea","appearance-review-note");
  note.placeholder="Optional review note";
  note.setAttribute("aria-label","Visual review note");
  reportReview.append(decisionWrap,note);

  const actions=el("div","appearance-review-actions");
  const submit=el("button","primary");
  submit.type="button";
  decorateActionButton(submit,{
    icon:"arrow-up-from-bracket",
    label:"Submit review",
    tooltip:"Submit immutable visual review evidence",
  });
  submit.addEventListener("click",async()=>{
    const samples=[...reportReview.querySelectorAll("[data-review-ordinal]")].map(sample=>{
      const value=(field)=>starRatingValue(sample.querySelector('[data-rating-name="'+field+'"]'));
      return{
        ordinal:Number(sample.dataset.reviewOrdinal),
        geometryFidelity:value("geometryFidelity"),
        identityContinuity:value("identityContinuity"),
        surfaceRealism:value("surfaceRealism"),
      };
    });
    if(!decision.value||samples.some(sample=>(
      !Number.isInteger(sample.geometryFidelity)||sample.geometryFidelity<1
      ||!Number.isInteger(sample.identityContinuity)||sample.identityContinuity<1
      ||!Number.isInteger(sample.surfaceRealism)||sample.surfaceRealism<1
    ))){
      submit.title="Score all samples and choose an overall decision";
      return;
    }
    setBlockingButtonState(submit,true,{
      label:"Submit review",
      tooltip:"Submit immutable visual review evidence",
      icon:"arrow-up-from-bracket",
      busyLabel:"Submitting",
      busyTooltip:"Submitting visual review",
    });
    try{
      const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/review",{
        method:"POST",
        headers:{Accept:"application/json","content-type":"application/json"},
        body:JSON.stringify({samples,decision:decision.value,note:note.value.trim()||null}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
      renderSubmittedVisualReview(experiment,payload.review);
      if(reportFrame?.dataset?.reportUrl)reportFrame.src=reportFrame.dataset.reportUrl;
      await loadAppearanceExperiments();
    }catch(error){
      setBlockingButtonState(submit,false,{
        label:"Submit review",
        tooltip:error instanceof Error?error.message:String(error),
        icon:"arrow-up-from-bracket",
      });
    }
  });
  actions.append(submit);
  reportReview.append(actions);
}

async function loadVisualReview(experiment){
  if(!reportReview)return;
  if(experiment.visual?.status!=="completed"){
    reportReview.replaceChildren(
      el("div","appearance-review-head"),
    );
    reportReview.firstChild.append(
      el("h3",null,"Human review"),
      el("p",null,"Visual scoring becomes available after all A/B images are generated."),
    );
    return;
  }
  if(!experiment.artifacts?.visualReview?.objectRef){
    renderVisualReviewForm(experiment);
    return;
  }
  reportReview.replaceChildren(el("p","appearance-review-note-readonly","Loading review…"));
  try{
    const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/review",{
      headers:{Accept:"application/json"},
      cache:"no-store",
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok||!payload?.review)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    renderSubmittedVisualReview(experiment,payload.review);
  }catch(error){
    reportReview.replaceChildren(el("p","appearance-experiment-error","Review unavailable: "+(error instanceof Error?error.message:String(error))));
  }
}

function parseShadowObject(text,name){
  let value;
  try{value=JSON.parse(text||"{}")}
  catch{throw new Error(name+" must be valid JSON")}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(name+" must be a JSON object");
  return value;
}

function openShadowCalibrationDialog(experiment){
  if(!shadowDialog)return;
  shadowBaseExperiment=experiment;
  if(shadowContext)shadowContext.textContent=
    "Baseline "+experiment.experimentId+" · "+(experiment.summary?.referencePopulation??"unknown population");
  if(shadowRationale)shadowRationale.value="";
  if(shadowEvidence)shadowEvidence.value="";
  if(shadowValues)shadowValues.value="{}";
  if(shadowVariation)shadowVariation.value="{}";
  shadowDialog.showModal();
}

async function launchShadowCalibration(){
  const experiment=shadowBaseExperiment;
  if(!experiment||!shadowRun)return;
  const rationale=shadowRationale?.value?.trim()??"";
  const evidence=(shadowEvidence?.value??"")
    .split("\n")
    .map(value=>value.trim())
    .filter(Boolean);
  if(rationale===""||evidence.length===0){
    shadowRun.title="Rationale and at least one evidence reference are required";
    return;
  }
  let values,variation;
  try{
    values=parseShadowObject(shadowValues?.value,"Value changes");
    variation=parseShadowObject(shadowVariation?.value,"Variation changes");
  }catch(error){
    shadowRun.title=error instanceof Error?error.message:String(error);
    return;
  }

  setBlockingButtonState(shadowRun,true,{
    label:"Run shadow experiment",
    tooltip:"Run shadow calibration experiment",
    busyLabel:"Launching",
    busyTooltip:"Launching same-seed shadow calibration experiment",
  });
  try{
    const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/shadow",{
      method:"POST",
      headers:{Accept:"application/json","content-type":"application/json"},
      body:JSON.stringify({values,variation,rationale,evidence}),
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    shadowDialog?.close();
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(shadowRun,false,{
      label:"Run shadow experiment",
      tooltip:error instanceof Error?error.message:String(error),
    });
  }
}

async function freezeCalibrationCandidate(experiment,button){
  setBlockingButtonState(button,true,{
    label:"Freeze candidate",
    tooltip:"Freeze reviewed shadow evidence as a calibration candidate",
    busyLabel:"Freezing",
    busyTooltip:"Writing immutable calibration candidate evidence",
  });
  try{
    const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/candidate",{
      method:"POST",
      headers:{Accept:"application/json"},
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(button,false,{
      label:"Freeze candidate",
      tooltip:error instanceof Error?error.message:String(error),
    });
  }
}

async function readCalibrationApprovalState(experiment){
  const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/approval",{
    headers:{Accept:"application/json"},
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
  return payload;
}

async function approveCalibrationCandidate(experiment,button){
  setBlockingButtonState(button,true,{
    label:"Approve",
    tooltip:"Review projected impact and approve candidate evidence",
    busyLabel:"Checking",
    busyTooltip:"Reading current World impact",
  });
  try{
    const state=await readCalibrationApprovalState(experiment);
    if(state.approval){
      await loadAppearanceExperiments();
      return;
    }
    const candidate=state.candidate;
    const impact=state.impact;
    const changes=[
      ...(candidate?.proposedCalibration?.values??[]).map(change=>change.locus+" "+change.from+" → "+change.to),
      ...(candidate?.proposedCalibration?.variation??[]).map(change=>change.parameter+" "+change.from+" → "+change.to),
    ];
    const message=[
      "Approve "+candidate.referencePopulation+" @"+candidate.proposedCalibration.version+"?",
      "",
      changes.join("\n"),
      "",
      "Projected existing impact: "+impact.threadCount+" Thread(s), "+impact.lineageCount+" lineage side(s).",
      "",
      "Approval records immutable human authority evidence. It does NOT make the calibration live until the approval is admitted to the Git-owned registry and deployed.",
    ].join("\n");
    if(!window.confirm(message)){
      setBlockingButtonState(button,false,{
        label:"Approve",
        tooltip:"Review projected impact and approve candidate evidence",
      });
      return;
    }

    setBlockingButtonState(button,true,{
      label:"Approve",
      tooltip:"Approve candidate evidence",
      busyLabel:"Approving",
      busyTooltip:"Recording immutable calibration approval",
    });
    const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/approval",{
      method:"POST",
      headers:{Accept:"application/json"},
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(button,false,{
      label:"Approve",
      tooltip:error instanceof Error?error.message:String(error),
    });
  }
}

async function copyCalibrationApproval(experiment,button){
  try{
    const state=await readCalibrationApprovalState(experiment);
    if(!state.approval)throw new Error("Calibration is not approved yet");
    await copyWithFeedback(button,state.approval,{
      label:"Copy approval",
      tooltip:"Copy approval JSON for source admission",
      copiedLabel:"Copied approval",
      failedLabel:"Copy approval failed",
      iconOnly:true,
    });
  }catch(error){
    button.title=error instanceof Error?error.message:String(error);
  }
}

function renderAppearanceExperiments(){
  if(!experiments)return;
  experiments.replaceChildren();
  if(experimentSnapshot.length===0){
    experiments.append(el("div","empty","No persisted Population Lab experiments."));
    return;
  }
  for(const experiment of experimentSnapshot){
    const row=el("article","appearance-experiment");
    const copy=el("div","appearance-experiment-copy");
    const head=el("div","appearance-experiment-head");
    head.append(
      el("strong",null,experiment.experimentId),
      experimentStatusPill(experimentStatus(experiment.status)),
    );
    const visualState=visualStatus(experiment.visual?.status);
    if(visualState)head.append(experimentStatusPill(visualState));
    const reviewedState=reviewStatus(experiment.review);
    if(reviewedState)head.append(experimentStatusPill(reviewedState));
    if(experiment.summary?.shadow)head.append(experimentStatusPill({label:"Shadow",tone:"warn",active:false}));
    if(experiment.artifacts?.calibrationCandidate?.objectRef){
      head.append(experimentStatusPill({label:"Candidate Evidence",tone:"good",active:false}));
    }
    if(experiment.artifacts?.calibrationApproval?.objectRef){
      head.append(experimentStatusPill({label:"Approved",tone:"good",active:false}));
    }
    const meta=el("span","appearance-experiment-meta",experimentSummary(experiment));
    const started=experiment.startedAt?new Date(experiment.startedAt).toLocaleString():"";
    if(started)meta.textContent+=" · "+started;
    if(experiment.visual?.status){
      const progress=visualProgress(experiment);
      if(progress){
        meta.textContent+=" · geometry "+progress.geometry+"/"+progress.sampleSize
          +" · portraits "+progress.portraits+"/"+progress.sampleSize;
      }
    }
    if(experiment.review?.scores){
      meta.textContent+=" · review G"+experiment.review.scores.geometryFidelity
        +" · I"+experiment.review.scores.identityContinuity
        +" · S"+experiment.review.scores.surfaceRealism;
    }
    if(experiment.summary?.shadowOfExperimentId){
      meta.textContent+=" · baseline "+experiment.summary.shadowOfExperimentId;
    }
    if(experiment.approval?.impact){
      meta.textContent+=" · approval impact "+experiment.approval.impact.threadCount+" Thread(s)";
    }
    copy.append(head,meta);
    if(experiment.error?.message)copy.append(el("span","appearance-experiment-error",experiment.error.message));
    if(experiment.visual?.error?.message)copy.append(el("span","appearance-experiment-error","Visuals: "+experiment.visual.error.message));

    const actions=el("div","appearance-experiment-actions");

    if(experiment.status==="completed"&&!experiment.summary?.shadow){
      const shadow=el("button","secondary appearance-refine-action");
      shadow.type="button";
      decorateActionButton(shadow,{
        icon:"wrench",
        label:"Refine",
        tooltip:"Evaluate explicit calibration changes against the same deterministic cohort",
      });
      shadow.addEventListener("click",()=>openShadowCalibrationDialog(experiment));
      actions.append(shadow);
    }

    if(
      experiment.status==="completed"
      && experiment.summary?.shadow
      && experiment.review?.decision==="supports_candidate"
      && !experiment.artifacts?.calibrationCandidate?.objectRef
    ){
      const freeze=el("button","secondary");
      freeze.type="button";
      decorateActionButton(freeze,{
        icon:"wrench",
        label:"Freeze candidate",
        tooltip:"Freeze this reviewed shadow proposal as immutable candidate evidence",
      });
      freeze.addEventListener("click",()=>void freezeCalibrationCandidate(experiment,freeze));
      actions.append(freeze);
    }

    if(
      experiment.artifacts?.calibrationCandidate?.objectRef
      && !experiment.artifacts?.calibrationApproval?.objectRef
    ){
      const approve=el("button","secondary appearance-approval-action");
      approve.type="button";
      decorateActionButton(approve,{
        icon:"check",
        label:"Approve",
        tooltip:"Review projected impact and approve this calibration candidate",
      });
      approve.addEventListener("click",()=>void approveCalibrationCandidate(experiment,approve));
      actions.append(approve);
    }

    if(experiment.artifacts?.calibrationApproval?.objectRef){
      const copyApproval=el("button","icon-button");
      copyApproval.type="button";
      decorateCopyAction(copyApproval,{
        label:"Copy approval",
        tooltip:"Copy approval JSON for source admission",
        iconOnly:true,
      });
      copyApproval.addEventListener("click",()=>void copyCalibrationApproval(experiment,copyApproval));
      actions.append(copyApproval);
    }

    const visualActive=["queued","running"].includes(experiment.visual?.status);
    const visualRetryable=experiment.visual?.status==="failed"&&!experiment.visual?.startedAt;
    if(experiment.status==="completed"&&(!experiment.visual||visualActive||visualRetryable)){
      const visuals=el("button","secondary appearance-visual-action");
      const progress=visualProgress(experiment);
      visuals.type="button";
      visuals.disabled=visualActive;
      decorateActionButton(visuals,{
        icon:visualActive?"rotate":"image",
        label:visualActive?"Progress "+(progress?.completed??0)+"/"+(progress?.total??8):visualRetryable?"Retry visuals":"Run visuals",
        tooltip:visualActive
          ?"Generating images: "+(progress?.completed??0)+"/"+(progress?.total??8)
          :visualRetryable
            ?"Retry the same visual manifest; the prior Workflow never started"
            :"Generate 4 geometry anchors and 4 reference-conditioned portraits",
        spinning:visualActive,
      });
      if(!visualActive)visuals.addEventListener("click",async()=>{
        if(!window.confirm(visualRetryable
          ?"Retry the same visual fidelity run? The prior Workflow did not start, so this will reuse the exact immutable manifest."
          :"Run the 4-person visual fidelity sample? This generates 8 images through Asset Generator."))return;
        visuals.disabled=true;
        decorateActionButton(visuals,{
          icon:"rotate",
          label:"Progress 0/8",
          tooltip:"Queueing visual fidelity experiment",
          spinning:true,
        });
        try{
          const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/visuals",{
            method:"POST",
            headers:{Accept:"application/json"},
          });
          const payload=await response.json().catch(()=>null);
          if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
          await loadAppearanceExperiments();
        }catch(error){
          await loadAppearanceExperiments().catch(()=>{});
          if(!visuals.isConnected)return;
          visuals.disabled=false;
          decorateActionButton(visuals,{
            icon:"image",
            label:visualRetryable?"Retry visuals":"Run visuals",
            tooltip:error instanceof Error?error.message:String(error),
          });
        }
      });
      actions.append(visuals);
    }
    if(experiment.artifacts?.report?.objectRef||experiment.artifacts?.visualReport?.objectRef){
      const open=el("button","secondary","Open report");
      open.type="button";
      open.title="Review experiment report inside Admin";
      open.addEventListener("click",()=>openExperimentReport(experiment));
      actions.append(open);
    }

    const remove=el("button","secondary");
    remove.type="button";
    const terminal=!["queued","running"].includes(experiment.status)
      && !["queued","running"].includes(experiment.visual?.status);
    const retained=Boolean(experiment.artifacts?.calibrationApproval?.objectRef);
    remove.disabled=!terminal||retained;
    decorateActionButton(remove,{
      icon:"trash-can",
      label:"Delete experiment",
      tooltip:retained
        ?"Approved calibration evidence is retained"
        :terminal
          ?"Delete this experiment and all stored artifacts"
          :"Experiment can be deleted after it finishes",
      iconOnly:true,
    });
    remove.addEventListener("click",async()=>{
      if(!window.confirm("Delete experiment "+experiment.experimentId+" and all of its stored artifacts?"))return;
      remove.disabled=true;
      row.classList.add("deleting");
      decorateActionButton(remove,{
        icon:"rotate",
        label:"Deleting experiment",
        tooltip:"Deleting experiment artifacts",
        iconOnly:true,
        spinning:true,
      });
      try{
        const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId),{
          method:"DELETE",
          headers:{Accept:"application/json"},
        });
        const payload=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
        await loadAppearanceExperiments();
      }catch(error){
        row.classList.remove("deleting");
        remove.disabled=false;
        decorateActionButton(remove,{
          icon:"trash-can",
          label:"Delete experiment",
          tooltip:error instanceof Error?error.message:String(error),
          iconOnly:true,
        });
      }
    });
    actions.append(remove);
    row.append(copy,actions);
    experiments.append(row);
  }
}

export async function loadAppearanceExperiments(){
  if(experimentLoadPromise)return experimentLoadPromise;
  experimentLoadPromise=(async()=>{
    try{
      const response=await fetch("/api/appearance/experiments",{headers:{Accept:"application/json"},cache:"no-store"});
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
      experimentSnapshot=Array.isArray(payload?.experiments)?payload.experiments:[];
      renderAppearanceExperiments();
      return experimentSnapshot;
    }catch(error){
      experimentSnapshot=[];
      if(experiments){
        experiments.replaceChildren(el("div","empty","Experiments unavailable: "+(error instanceof Error?error.message:String(error))));
      }
      throw error;
    }finally{
      experimentLoadPromise=null;
    }
  })();
  return experimentLoadPromise;
}

async function launchAppearanceExperiment(hole,button){
  if(!hole?.referencePopulation)throw new Error("Resolve durable ancestry provenance before running a calibration experiment");
  const spec={...actionSpec("experiment",hole),count:24};
  button.disabled=true;
  decorateActionButton(button,{
    icon:"rotate",
    label:"Launching experiment",
    tooltip:"Launching Population Lab experiment",
    iconOnly:true,
    spinning:true,
  });
  try{
    const response=await fetch("/api/appearance/experiments",{
      method:"POST",
      headers:{Accept:"application/json","Content-Type":"application/json"},
      body:JSON.stringify(spec),
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    detail.querySelector(".appearance-prepared-action")?.remove();
    const panel=el("div","appearance-prepared-action");
    panel.append(
      el("strong",null,"Population Lab experiment queued"),
      el("p",null,"The controlled physical cohort is running asynchronously. Refresh the experiment list to inspect status or open the report when complete."),
      el("pre","appearance-action-json",JSON.stringify({
        experimentId:payload?.experiment?.experimentId??null,
        status:payload?.experiment?.status??payload?.workflow?.status??"queued",
        referencePopulation:hole.referencePopulation,
        count:24,
      },null,2)),
    );
    detail.append(panel);
    await loadAppearanceExperiments();
  }finally{
    button.disabled=false;
    decorateActionButton(button,{
      icon:"wrench",
      label:"Run experiment",
      tooltip:"Run a bounded controlled physical cohort for this coverage hole",
    });
  }
}

function chainText(calibration){
  const chain=calibration?.dependencyChain;
  if(!Array.isArray(chain)||chain.length===0)return "—";
  return chain.map(({id,version})=>`${id}@${version}`).join(" → ");
}

function threadIdentity(thread,{compact=false}={}){
  return createThreadIdentityViewer({
    threadId:thread?.threadId,
    name:thread?.threadName??thread?.threadId??"Thread",
    compact,
    className:"appearance-thread-viewer",
  });
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

function renderPreparedAction(kind,hole){
  detail.querySelector(".appearance-prepared-action")?.remove();
  const panel=el("div","appearance-prepared-action");
  panel.append(el("strong",null,"Research request prepared"));
  panel.append(el("p",null,
    "This spec is ready for the research adapter. Research may propose calibration evidence but cannot mutate the model."
  ));
  const spec=actionSpec(kind,hole);
  const pre=el("pre","appearance-action-json",JSON.stringify(spec,null,2));
  const copy=el("button","secondary");
  copy.type="button";
  bindCopyAction(copy,{
    value:spec,
    label:"Copy JSON",
    tooltip:"Copy action JSON",
    copiedLabel:"Copied",
    failedLabel:"Copy failed",
    iconOnly:false,
  });
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

  const threadViewer=el("div","appearance-thread-viewers");
  for(const thread of hole.threads??[])threadViewer.append(threadIdentity(thread));

  const places=el("div","appearance-place-list");
  for(const place of (hole.places??[]).slice(0,10)){
    places.append(createThreadLocation(place,{
      className:"appearance-place-chip",
      suffix:" · "+place.count,
    }));
  }

  const actions=el("div","appearance-hole-actions");

  const experimentButton=el("button","secondary");
  experimentButton.type="button";
  experimentButton.disabled=!hole.referencePopulation;
  decorateActionButton(experimentButton,{
    icon:"wrench",
    label:"Run experiment",
    tooltip:hole.referencePopulation
      ?"Run a bounded controlled physical cohort for this coverage hole"
      :"Resolve durable ancestry provenance before running a calibration experiment",
  });
  experimentButton.addEventListener("click",()=>void launchAppearanceExperiment(hole,experimentButton).catch((error)=>{
    detail.querySelector(".appearance-prepared-action")?.remove();
    const panel=el("div","appearance-prepared-action");
    panel.append(
      el("strong",null,"Experiment launch failed"),
      el("p",null,error instanceof Error?error.message:String(error)),
    );
    detail.append(panel);
  }));
  actions.append(experimentButton);

  const researchButton=el("button","secondary");
  researchButton.type="button";
  decorateActionButton(researchButton,{
    icon:"file-export",
    label:"Prepare research",
    tooltip:"Prepare an evidence-research request for this coverage hole",
  });
  researchButton.addEventListener("click",()=>{
    researchButton.disabled=true;
    decorateActionButton(researchButton,{
      icon:"rotate",
      label:"Preparing research",
      tooltip:"Preparing research specification",
      iconOnly:true,
      spinning:true,
    });
    requestAnimationFrame(()=>{
      renderPreparedAction("research",hole);
      researchButton.disabled=false;
      decorateActionButton(researchButton,{
        icon:"file-export",
        label:"Prepare research",
        tooltip:"Prepare an evidence-research request for this coverage hole",
      });
    });
  });
  actions.append(researchButton);

  detail.append(head,facts,chain,populations,threadViewer,places,actions);
}

function renderHoles(){
  rows.replaceChildren();
  for(const hole of snapshot?.holes??[]){
    const tr=document.createElement("tr");
    tr.classList.toggle("selected",hole.key===selectedKey);
    tr.tabIndex=0;
    const ref=el("td","appearance-hole-reference",hole.referencePopulation??"Missing provenance");
    const state=el("td","appearance-hole-coverage");
    state.append(el("span",`thread-health-tag ${coverageTone(hole.coverage)}`,human(hole.coverage)));
    const threads=el("td","appearance-hole-number",hole.threadCount);
    const sides=el("td","appearance-hole-number",hole.sides);
    const priority=el("td","appearance-hole-number",hole.priority);
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

function isRecalibrationCandidate(candidate){
  return (candidate?.reasons??[candidate?.reason]).some((reason)=>
    reason==="dependency_snapshot_missing"||reason==="calibration_dependencies_changed"
  );
}

function migrationReason(candidate){
  if(candidate.reason==="dependency_snapshot_missing")return "Stored calibration dependency snapshot is missing.";
  if(candidate.reason==="calibration_dependencies_changed")return "One or more stored calibration dependencies differ from the current resolved chain.";
  return human(candidate.reason);
}

function migrationOrigin(candidate){
  const labels=candidate?.physicalOrigins?.summary;
  return Array.isArray(labels)&&labels.length>0?labels.join(" · "):"Recorded physical ancestry";
}

function birthplaceNode(location){
  return createThreadLocation(location,{className:"appearance-migration-place-value"});
}

function pendingCandidateList(){
  const merged=new Map((snapshot?.migrationCandidates??[])
    .filter(isRecalibrationCandidate)
    .map((candidate)=>[candidate.threadId,candidate]));
  for(const [threadId,{candidate}] of pendingMigrations){
    if(!merged.has(threadId))merged.set(threadId,candidate);
  }
  return [...merged.values()].sort((a,b)=>(a.threadName??a.threadId).localeCompare(b.threadName??b.threadId));
}

function clearMigrationPending(threadId){
  const current=pendingMigrations.get(threadId);
  current?.stop?.();
  pendingMigrations.delete(threadId);
  renderMigrations();
  renderMap();
}

async function reconcilePendingMigration(threadId){
  if(!pendingMigrations.has(threadId))return;
  try{
    const health=await requestThreadAppearanceHealth(threadId);
    const state=threadAppearanceState(health.diagnosis);
    if(
      state.appearanceReady
      ||state.appearanceBlocked
      ||health.reconciliation?.state==="dead_letter"
      ||(!state.appearancePending&&!state.canMigrate)
    ){
      clearMigrationPending(threadId);
      await loadAppearanceCoverage({quiet:true});
    }
  }catch(error){
    console.warn("Appearance migration reconciliation failed",error);
  }
}

function watchMigration(threadId){
  const current=pendingMigrations.get(threadId);
  if(!current||current.stop)return;
  const stop=watchAdminLive(
    threadViewKey(threadId,"presentation"),
    ()=>reconcilePendingMigration(threadId),
    {
      active:()=>pendingMigrations.has(threadId),
      reconcileOnSubscribe:true,
    },
  );
  pendingMigrations.set(threadId,{...current,stop});
}

function setMigrationPending(candidate){
  const current=pendingMigrations.get(candidate.threadId);
  pendingMigrations.set(candidate.threadId,{candidate,stop:current?.stop??null});
  renderMigrations();
  renderMap();
}

async function openMigrationAction(candidate,button){
  button.disabled=true;
  decorateActionButton(button,{
    icon:"rotate",
    label:"Checking calibration",
    tooltip:"Reading current Appearance authority",
    iconOnly:true,
    spinning:true,
  });
  try{
    const health=await requestThreadAppearanceHealth(candidate.threadId);
    const state=threadAppearanceState(health.diagnosis);
    const migration=state.migration;
    if(!migration)throw new Error("Appearance recalibration is no longer required for this Thread.");
    const label=migration.label??"Update appearance calibration";
    openThreadActionDialog({
      threadId:candidate.threadId,
      threadName:candidate.threadName,
      label,
      eyebrow:"Appearance authority",
      description:"Recalculate this Thread from its durable physical ancestry against the current versioned appearance calibration, then let the normal canonical publication path converge.",
      fields:actionFields(migration),
      run:async(input)=>{
        setMigrationPending(candidate);
        try{
          const payload=await postThreadAppearanceRepair(candidate.threadId,{
            action:"migrate",
            migrationId:migration.id,
            migrationKey:`admin_appearance_calibration_${Date.now().toString(36)}`,
            input,
          });
          const after=threadAppearanceState(payload?.migration?.after);
          if(after.appearancePending){
            watchMigration(candidate.threadId);
          }else{
            clearMigrationPending(candidate.threadId);
          }
          await loadAppearanceCoverage({quiet:true});
        }catch(error){
          clearMigrationPending(candidate.threadId);
          throw error;
        }
      },
    });
  }finally{
    button.disabled=false;
    decorateActionButton(button,{
      icon:"wrench",
      label:"Update calibration",
      tooltip:"Recalculate this Thread from durable ancestry against the current appearance calibration.",
    });
  }
}

function migrationIsBusy(candidate){
  return pendingMigrations.has(candidate.threadId)
    ||busyThreads.has(candidate.threadId)
    ||candidate.active===true;
}

function defaultMigrationInput(migration){
  const input={};
  for(const field of actionFields(migration)){
    if(typeof field?.name!=="string"||field.name==="")continue;
    if(field.default!==undefined&&field.default!==null&&String(field.default)!==""){
      input[field.name]=field.default;
      continue;
    }
    if(field.required===true){
      throw new Error("Migration requires operator input: "+(field.label??field.name));
    }
  }
  return input;
}

function renderMigrateAllAction(candidates){
  if(!migrateAllButton)return;
  if(migrationBatch){
    const done=Math.min(migrationBatch.completed,migrationBatch.total);
    migrateAllButton.disabled=true;
    decorateActionButton(migrateAllButton,{
      icon:"rotate",
      label:"Progress "+done+"/"+migrationBatch.total,
      tooltip:"Launching affected Thread migrations sequentially",
      spinning:true,
    });
    return;
  }
  const available=candidates.filter(candidate=>!migrationIsBusy(candidate));
  migrateAllButton.disabled=available.length===0;
  decorateActionButton(migrateAllButton,{
    icon:"wrench",
    label:"Migrate affected",
    tooltip:available.length===0
      ?"No affected Thread is currently ready to migrate"
      :"Migrate "+available.length+" affected Thread"+(available.length===1?"":"s")+" sequentially through World authority",
  });
}

async function migrateAffectedThreads(){
  if(migrationBatch)return;
  const candidates=pendingCandidateList().filter(candidate=>!migrationIsBusy(candidate));
  if(candidates.length===0)return;
  if(!window.confirm(
    "Migrate "+candidates.length+" affected Thread"+(candidates.length===1?"":"s")
    +" to the current approved appearance calibration?\n\n"
    +"Each Thread keeps its durable ancestry and existing history. Migrations launch sequentially through the same World authority path used by the individual action."
  ))return;

  migrationBatch={completed:0,total:candidates.length,failures:[]};
  renderMigrations();
  const batchKey=Date.now().toString(36);
  try{
    for(const [index,candidate] of candidates.entries()){
      try{
        const health=await requestThreadAppearanceHealth(candidate.threadId);
        const migration=threadAppearanceState(health.diagnosis).migration;
        if(!migration){
          migrationBatch.completed=index+1;
          renderMigrations();
          continue;
        }
        const input=defaultMigrationInput(migration);
        setMigrationPending(candidate);
        const payload=await postThreadAppearanceRepair(candidate.threadId,{
          action:"migrate",
          migrationId:migration.id,
          migrationKey:"admin_appearance_workset_"+batchKey+"_"+String(index+1),
          input,
        });
        const after=threadAppearanceState(payload?.migration?.after);
        if(after.appearancePending)watchMigration(candidate.threadId);
        else clearMigrationPending(candidate.threadId);
      }catch(error){
        clearMigrationPending(candidate.threadId);
        migrationBatch.failures.push({
          threadId:candidate.threadId,
          message:error instanceof Error?error.message:String(error),
        });
      }
      migrationBatch.completed=index+1;
      renderMigrations();
    }
    await loadAppearanceCoverage({quiet:true});
  }finally{
    const failures=migrationBatch?.failures??[];
    migrationBatch=null;
    renderMigrations();
    if(failures.length>0&&migrateAllButton){
      migrateAllButton.title=failures.length+" migration launch failure"+(failures.length===1?"":"s")+": "
        +failures.map(item=>item.threadId+" · "+item.message).join(" | ");
    }
  }
}

function renderMigrations(){
  migrations.replaceChildren();
  const candidates=pendingCandidateList();
  renderMigrateAllAction(candidates);
  if(candidates.length===0){
    migrations.append(el("p","thread-repair-note","No admitted Thread with durable ancestry evidence is stale against the current versioned calibration dependencies."));
    return;
  }

  for(const candidate of candidates){
    const calibrationPending=pendingMigrations.has(candidate.threadId);
    const localBusy=busyThreads.has(candidate.threadId);
    const worldBusy=candidate.active===true;
    const busy=calibrationPending||localBusy||worldBusy;
    const row=el("div","appearance-migration-row");
    if(busy)row.classList.add("is-pending");

    const person=threadIdentity(candidate);
    const meta=el("div","appearance-migration-meta");
    const origin=el("div","appearance-migration-origin");
    origin.append(el("strong",null,"Ethnicity"),el("span",null,migrationOrigin(candidate)));
    const birthplace=el("div","appearance-migration-place");
    birthplace.append(el("strong",null,"Birth place"),birthplaceNode(candidate.birthLocation));
    meta.append(origin,birthplace);

    const status=el("div","appearance-migration-status");
    const tag=el("span","thread-health-tag warn",
      calibrationPending?"Updating calibration":localBusy?"Repair / migration active":worldBusy?"Reconciliation active":"Needs recalibration"
    );
    if(busy)tag.classList.add("thread-pending-throb");
    const reason=el("p",null,
      calibrationPending
        ?"Appearance authority is updating and canonical publication is converging."
        :localBusy
          ?"This Thread currently has an operator repair or migration in progress."
          :worldBusy
            ?"World reconciliation for this Thread is still active."
            :migrationReason(candidate)
    );
    status.append(tag,reason);
    const changes=el("div","appearance-migration-changes");
    for(const change of candidate.changes??[]){
      const from=change.from?.dependencyChain?.at(-1);
      const to=change.to?.dependencyChain?.at(-1);
      changes.append(el("span",null,`${from?`${from.id}@${from.version}`:"unversioned"} → ${to?`${to.id}@${to.version}`:"removed"}`));
    }
    if(changes.childElementCount>0)status.append(changes);

    const actions=el("div","appearance-migration-actions");
    const action=el("button","secondary");
    action.type="button";
    if(busy){
      action.disabled=true;
      decorateActionButton(action,{
        icon:"rotate",
        label:calibrationPending?"Updating":worldBusy&&!localBusy?"Reconciling":"Working",
        tooltip:calibrationPending
          ?"Appearance recalibration is in progress"
          :worldBusy&&!localBusy
            ?"World reconciliation is in progress"
            :"Thread repair or migration is in progress",
        spinning:true,
      });
    }else{
      decorateActionButton(action,{
        icon:"wrench",
        label:"Update calibration",
        tooltip:"Recalculate this Thread from durable ancestry against the current appearance calibration.",
      });
      action.addEventListener("click",()=>void openMigrationAction(candidate,action));
    }
    actions.append(action);

    const identity=el("div","appearance-migration-identity");
    identity.append(person,meta);
    row.append(identity,status,actions);
    migrations.append(row);
  }
}

function clearMapPopoverClose(){
  if(mapPopoverCloseTimer!==null)window.clearTimeout(mapPopoverCloseTimer);
  mapPopoverCloseTimer=null;
}

function hideMapPopover(){
  clearMapPopoverClose();
  if(mapPopover)mapPopover.hidden=true;
}

function scheduleMapPopoverClose(){
  clearMapPopoverClose();
  mapPopoverCloseTimer=window.setTimeout(hideMapPopover,2000);
}

function ensureMapPopover(){
  if(mapPopover)return mapPopover;
  mapPopover=el("div","appearance-map-popover");
  mapPopover.hidden=true;
  mapPopover.addEventListener("pointerenter",clearMapPopoverClose);
  mapPopover.addEventListener("pointerleave",scheduleMapPopoverClose);
  mapShell?.append(mapPopover);
  return mapPopover;
}

function showMapPopover(hole,place,marker){
  clearMapPopoverClose();
  const popover=ensureMapPopover();
  const head=el("div","appearance-map-popover-head");
  const placeLabel=el("strong");
  placeLabel.append(createThreadLocation(place));
  head.append(
    placeLabel,
    el("span",null,String(place.threadIds?.length??0)+" Thread"+((place.threadIds?.length??0)===1?"":"s")),
  );
  const threadById=new Map((hole.threads??[]).map((thread)=>[thread.threadId,thread]));
  const people=el("div","appearance-map-people");
  for(const threadId of place.threadIds??[]){
    people.append(threadIdentity(threadById.get(threadId)??{threadId,threadName:threadId},{compact:true}));
  }
  popover.replaceChildren(head,people);
  popover.hidden=false;

  const markerRect=marker.getBoundingClientRect();
  const shellRect=mapShell.getBoundingClientRect();
  const width=Math.min(320,Math.max(190,popover.offsetWidth||220));
  const left=Math.max(8,Math.min(shellRect.width-width-8,markerRect.left-shellRect.left+markerRect.width/2-width/2));
  const top=Math.max(8,markerRect.bottom-shellRect.top+8);
  popover.style.left=`${left}px`;
  popover.style.top=`${top}px`;
}

function renderMap(){
  if(!worldPath||!markers||!timezones)return;
  worldPath.setAttribute("d",WORLD_MAP_PATH);
  renderWorldTimeZoneLines(timezones);
  markers.replaceChildren();
  hideMapPopover();
  let points=0;
  for(const hole of snapshot?.holes??[]){
    const activeThreadIds=new Set((hole.threads??[])
      .filter((thread)=>thread.active===true)
      .map((thread)=>thread.threadId));
    for(const place of hole.places??[]){
      if(!Number.isFinite(Number(place.lat))||!Number.isFinite(Number(place.long)))continue;
      const point=worldMapPoint(Number(place.lat),Number(place.long));
      const circle=document.createElementNS(SVG_NS,"circle");
      circle.setAttribute("cx",point.x.toFixed(1));
      circle.setAttribute("cy",point.y.toFixed(1));
      circle.setAttribute("r",String(Math.min(12,4+Math.sqrt(place.count??1)*2)));
      circle.classList.add("appearance-hole-marker",`coverage-${hole.coverage}`);
      if((place.threadIds??[]).some((threadId)=>
        pendingMigrations.has(threadId)||busyThreads.has(threadId)||activeThreadIds.has(threadId)
      ))circle.classList.add("active");
      circle.setAttribute("tabindex","0");
      circle.setAttribute("role","button");
      circle.setAttribute("aria-label",`${hole.referencePopulation??"Missing provenance"} at ${place.displayName??place.city??"represented place"}`);
      const select=()=>{
        selectedKey=hole.key;
        renderHoles();
        renderDetail();
        showMapPopover(hole,place,circle);
      };
      circle.addEventListener("pointerenter",()=>showMapPopover(hole,place,circle));
      circle.addEventListener("pointerleave",scheduleMapPopoverClose);
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
  $("#appearance-stat-migrations").textContent=(payload.migrationCandidates??[]).filter(isRecalibrationCandidate).length;
  $("#appearance-stat-fallback").textContent=(payload.coverage?.fallback??0)+(payload.coverage?.missing??0);
  if(copyButton)copyButton.disabled=false;
  renderHoles();
  renderDetail();
  renderModel();
  renderMigrations();
  renderMap();
}

export function appearanceCoverageTopSummary(payload=snapshot){
  return Object.freeze({
    holes:payload?.holes?.length??0,
    migrations:(payload?.migrationCandidates??[]).filter(isRecalibrationCandidate).length,
    lineages:payload?.lineageCount??0,
  });
}

function setScanBusy(busy){
  scanButton.disabled=busy;
  if(busy){
    decorateActionButton(scanButton,{
      icon:"rotate",
      label:"Scanning appearance coverage",
      tooltip:"Scanning appearance coverage",
      iconOnly:true,
      spinning:true,
    });
    return;
  }
  decorateActionButton(scanButton,{
    label:"Scan coverage",
    tooltip:"Scan current Thread ancestry demand and appearance calibration coverage",
  });
}

export async function loadAppearanceCoverage({quiet=false}={}){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
    if(!quiet)setScanBusy(true);
    try{
      const response=await fetch("/api/appearance/coverage",{headers:{Accept:"application/json"},cache:"no-store"});
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.detail??payload?.error??`HTTP ${response.status}`);
      renderAppearanceCoverage(payload);
      void loadAppearanceExperiments().catch(()=>{});
      return payload;
    }finally{
      if(!quiet)setScanBusy(false);
    }
  })();
  try{
    return await loadPromise;
  }finally{
    loadPromise=null;
  }
}

if(shadowRun)decorateActionButton(shadowRun,{
  icon:"wrench",
  label:"Run shadow experiment",
  tooltip:"Run the proposed calibration against the baseline cohort seed",
});
shadowRun?.addEventListener("click",()=>void launchShadowCalibration());
shadowClose?.addEventListener("click",()=>shadowDialog?.close());
shadowCancel?.addEventListener("click",()=>shadowDialog?.close());
shadowDialog?.addEventListener("close",()=>{
  shadowBaseExperiment=null;
  if(shadowRun)setBlockingButtonState(shadowRun,false,{
    label:"Run shadow experiment",
    tooltip:"Run the proposed calibration against the baseline cohort seed",
    icon:"wrench",
  });
});

if(reportNewTab)decorateActionButton(reportNewTab,{
  icon:"arrow-up-from-bracket",
  label:"Open in new tab",
  tooltip:"Open this report in a new tab",
});
reportNewTab?.addEventListener("click",()=>{
  const url=reportFrame?.dataset?.reportUrl;
  if(url)window.open(url,"_blank","noopener");
});
reportClose?.addEventListener("click",()=>reportDialog?.close());
reportDialog?.addEventListener("click",(event)=>{
  if(event.target===reportDialog)reportDialog.close();
});
reportDialog?.addEventListener("close",()=>{
  reportReview?.replaceChildren();
  if(reportFrame){
    reportFrame.src="about:blank";
    delete reportFrame.dataset.reportUrl;
  }
});

if(copyButton)bindCopyAction(copyButton,{
  value:()=>snapshot??{},
  label:"Copy coverage",
  tooltip:"Copy appearance coverage JSON",
  copiedLabel:"Coverage copied",
  failedLabel:"Copy coverage failed",
  iconOnly:true,
});
if(experimentRefreshButton)setRefreshButtonState(experimentRefreshButton,false,{
  label:"Refresh experiments",
  tooltip:"Refresh Population Lab experiments",
  iconOnly:true,
});
migrateAllButton?.addEventListener("click",()=>void migrateAffectedThreads());
scanButton?.addEventListener("click",()=>void loadAppearanceCoverage());
experimentRefreshButton?.addEventListener("click",async()=>{
  setRefreshButtonState(experimentRefreshButton,true,{
    label:"Refresh experiments",
    tooltip:"Refresh Population Lab experiments",
    busyTooltip:"Refreshing Population Lab experiments",
    iconOnly:true,
  });
  try{await loadAppearanceExperiments()}
  finally{
    setRefreshButtonState(experimentRefreshButton,false,{
      label:"Refresh experiments",
      tooltip:"Refresh Population Lab experiments",
      iconOnly:true,
    });
  }
});
window.addEventListener("fibre:thread-action-busy",(event)=>{
  const threadId=event?.detail?.threadId;
  if(typeof threadId!=="string"||threadId==="")return;
  if(event.detail?.busy===true)busyThreads.add(threadId);
  else busyThreads.delete(threadId);
  if(snapshot!==null){
    renderMigrations();
    renderMap();
  }
});
