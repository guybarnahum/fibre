import { populationLabExperimentName } from "./population-lab-experiment-name.js";
import { populationLabExperimentParentId, populationLabExperimentRows } from "./population-lab-experiment-tree.js";
import {
  populationLabCalibrationHistoryGroups,
  populationLabHistoricalExperimentIds,
  populationLabHistoryDraft,
  populationLabHistoryShadowDraft,
} from "./population-lab-history.js";
import {
  populationLabAdoptions,
  populationLabAffectedThreadIds,
  populationLabExperimentAdmitted,
} from "./population-lab-adoption.js";
import { bindPortraitPreview } from "./portrait-preview.js";
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
import {
  cssSimilarityMatrix,
  displayedImagePoint,
  eyeSimilarityTransform,
  normalizedImagePoint,
} from "./visual-eye-alignment.js";

const $=(selector)=>document.querySelector(selector);
const rows=$("#appearance-hole-rows");
const detail=$("#appearance-hole-detail");
const modelRows=$("#appearance-model-rows");
const migrations=$("#appearance-migration-candidates");
const experiments=$("#appearance-experiments");
const experimentRefreshButton=$("#appearance-experiments-refresh");
const calibrationHistory=$("#appearance-calibration-history");
const adoptionList=$("#appearance-adoptions");
const appearanceHelp=$("#appearance-help");
const appearanceHelpDialog=$("#appearance-help-dialog");
const appearanceHelpClose=$("#appearance-help-close");
const compareDialog=$("#appearance-compare-dialog");
const compareTitle=$("#appearance-compare-title");
const compareChanges=$("#appearance-compare-changes");
const compareActions=$("#appearance-compare-actions");
const compareClose=$("#appearance-compare-close");
const compareNumericalButton=$("#appearance-compare-numerical");
const compareVisualButton=$("#appearance-compare-visual");
const compareVisualRole=$("#appearance-compare-visual-role");
const compareGeometryButton=$("#appearance-compare-geometry");
const comparePortraitButton=$("#appearance-compare-portrait");
const compareRevealButton=$("#appearance-compare-reveal");
const compareSideBySideButton=$("#appearance-compare-side-by-side");
const compareNumericalBody=$("#appearance-compare-numerical-body");
const compareVisualBody=$("#appearance-compare-visual-body");
const compareParameterMatrix=$("#appearance-compare-parameter-matrix");
const compareHealthMatrix=$("#appearance-compare-health-matrix");
const compareBaselineReport=$("#appearance-compare-baseline-report");
const compareShadowReport=$("#appearance-compare-shadow-report");
const reportDialog=$("#appearance-report-dialog");
const reportTitle=$("#appearance-report-title");
const reportFrame=$("#appearance-report-frame");
const reportNewTab=$("#appearance-report-new-tab");
const reportClose=$("#appearance-report-close");
const reportReview=$("#appearance-report-review");
const shadowDialog=$("#appearance-shadow-dialog");
const shadowClose=$("#appearance-shadow-close");
const shadowImport=$("#appearance-shadow-import");
const shadowCopy=$("#appearance-shadow-copy");
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
let comparisonState=null;
let comparisonView="numerical";
let comparisonVisualRole="geometry";
let comparisonVisualMode="reveal";
const comparisonEyeAlignments=new Map();
let comparisonEyeAlignmentEditor=null;
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
  if(review?.decision==="open")return {label:"Review Open",tone:"warn",active:false};
  if(review?.decision==="supports_candidate")return {label:"Accepted",tone:"good",active:false};
  if(review?.decision==="reject")return {label:"Rejected",tone:"bad",active:false};
  if(review?.decision==="inconclusive")return {label:"Inconclusive",tone:"warn",active:false};
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
  const name=populationLabExperimentName(experiment);
  if(reportTitle)reportTitle.textContent=(experiment.visual?.status==="completed"?"Visual fidelity · ":"Experiment report · ")+name;
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
  bindPortraitPreview(thumb,{url:thumb.src,name:"Sample "+ordinal});
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
    el("h3",null,"Human review"),
    el("p",null,experiment.artifacts?.calibrationCandidate?.objectRef
      ?"Frozen with candidate evidence. Scores and decision are now immutable."
      :"Decision is locked. Reopen from Compare to edit the scores or note."),
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

function renderVisualReviewForm(experiment,saved=null){
  if(!reportReview)return;
  reportReview.replaceChildren();
  const progress=visualProgress(experiment);
  const sampleSize=progress?.sampleSize??4;
  const savedByOrdinal=new Map((saved?.samples??[]).map(sample=>[sample.ordinal,sample]));
  const head=el("div","appearance-review-head");
  head.append(
    el("h3",null,"Score visual fidelity"),
    el("p",null,"Score the A → B transition, not attractiveness or demographic identity. Save scoring here; Accept or Reject the experiment from Compare."),
    experimentStatusPill({label:"Review Open",tone:"warn",active:false}),
  );
  reportReview.append(head);

  for(let ordinal=1;ordinal<=sampleSize;ordinal+=1){
    const prior=savedByOrdinal.get(ordinal)??null;
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
        createStarRating({name:field,label:label+" score",value:prior?.[field]??0}),
      );
      grid.append(fieldLabel);
    }
    sample.append(grid);
    reportReview.append(sample);
  }

  const note=el("textarea","appearance-review-note");
  note.placeholder="Optional review note";
  note.setAttribute("aria-label","Visual review note");
  note.value=saved?.note??"";
  reportReview.append(note);

  const actions=el("div","appearance-review-actions");
  const submit=el("button","primary");
  submit.type="button";
  decorateActionButton(submit,{
    icon:"arrow-up-from-bracket",
    label:saved?"Save scoring":"Save scoring",
    tooltip:"Save editable scoring. Accept or Reject from Compare.",
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
    if(samples.some(sample=>(
      !Number.isInteger(sample.geometryFidelity)||sample.geometryFidelity<1
      ||!Number.isInteger(sample.identityContinuity)||sample.identityContinuity<1
      ||!Number.isInteger(sample.surfaceRealism)||sample.surfaceRealism<1
    ))){
      submit.title="Score all samples before saving";
      return;
    }
    setBlockingButtonState(submit,true,{
      label:"Save scoring",
      tooltip:"Save editable scoring",
      icon:"arrow-up-from-bracket",
      busyLabel:"Saving",
      busyTooltip:"Saving review scoring",
    });
    try{
      const response=await fetch("/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/review",{
        method:"POST",
        headers:{Accept:"application/json","content-type":"application/json"},
        body:JSON.stringify({samples,note:note.value.trim()||null}),
      });
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
      renderVisualReviewForm(experiment,payload.review);
      if(reportFrame?.dataset?.reportUrl)reportFrame.src=reportFrame.dataset.reportUrl;
      await loadAppearanceExperiments();
    }catch(error){
      setBlockingButtonState(submit,false,{
        label:"Save scoring",
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
    if(payload.review.decision==="open")renderVisualReviewForm(experiment,payload.review);
    else renderSubmittedVisualReview(experiment,payload.review);
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

function shadowProposalFromForm(){
  const experiment=shadowBaseExperiment;
  const evidence=(shadowEvidence?.value??"")
    .split("\n")
    .map(value=>value.trim())
    .filter(Boolean);
  return Object.freeze({
    ...(experiment?.summary?.referencePopulation?{referencePopulation:experiment.summary.referencePopulation}:{}),
    ...(experiment?.experimentId?{baseExperimentId:experiment.experimentId}:{}),
    rationale:shadowRationale?.value??"",
    evidence,
    values:parseShadowObject(shadowValues?.value,"Value changes"),
    variation:parseShadowObject(shadowVariation?.value,"Variation changes"),
  });
}

function normalizeImportedShadowProposal(raw){
  let value=raw;
  if(typeof value==="string"){
    try{value=JSON.parse(value)}
    catch{throw new Error("Refinement import must be valid JSON")}
  }
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("Refinement import must be a JSON object");
  }
  const expectedPopulation=shadowBaseExperiment?.summary?.referencePopulation??null;
  const expectedExperiment=shadowBaseExperiment?.experimentId??null;
  if(value.referencePopulation&&expectedPopulation&&value.referencePopulation!==expectedPopulation){
    throw new Error("Refinement JSON targets "+value.referencePopulation+", not "+expectedPopulation);
  }
  if(value.baseExperimentId&&expectedExperiment&&value.baseExperimentId!==expectedExperiment){
    throw new Error("Refinement JSON targets a different baseline experiment");
  }
  const evidence=Array.isArray(value.evidence)
    ?value.evidence.map(item=>String(item).trim()).filter(Boolean)
    :typeof value.evidence==="string"
      ?value.evidence.split("\n").map(item=>item.trim()).filter(Boolean)
      :[];
  return Object.freeze({
    rationale:typeof value.rationale==="string"?value.rationale:"",
    evidence,
    values:value.values??{},
    variation:value.variation??{},
  });
}

function applyImportedShadowProposal(raw){
  const proposal=normalizeImportedShadowProposal(raw);
  if(shadowRationale)shadowRationale.value=proposal.rationale;
  if(shadowEvidence)shadowEvidence.value=proposal.evidence.join("\n");
  if(shadowValues)shadowValues.value=JSON.stringify(parseShadowObject(JSON.stringify(proposal.values),"Value changes"),null,2);
  if(shadowVariation)shadowVariation.value=JSON.stringify(parseShadowObject(JSON.stringify(proposal.variation),"Variation changes"),null,2);
}

async function importShadowProposal(){
  let text=null;
  try{
    if(navigator.clipboard?.readText)text=await navigator.clipboard.readText();
  }catch{}
  if(!text)text=window.prompt("Paste calibration refinement JSON")??"";
  if(!text.trim())return;
  try{
    applyImportedShadowProposal(text);
    if(shadowImport)shadowImport.title="Imported refinement JSON";
  }catch(error){
    if(shadowImport)shadowImport.title=error instanceof Error?error.message:String(error);
  }
}

function openShadowCalibrationDialog(experiment){
  if(!shadowDialog)return;
  shadowBaseExperiment=experiment;
  if(shadowContext)shadowContext.textContent=
    "Baseline "+populationLabExperimentName(experiment)+" · "+experiment.experimentId;
  if(shadowRationale)shadowRationale.value="";
  if(shadowEvidence)shadowEvidence.value="";
  if(shadowValues)shadowValues.value="{}";
  if(shadowVariation)shadowVariation.value="{}";
  shadowDialog.showModal();
}

async function launchShadowCalibration(){
  const experiment=shadowBaseExperiment;
  if(!experiment||!shadowRun)return;
  let proposal;
  try{proposal=shadowProposalFromForm()}
  catch(error){
    shadowRun.title=error instanceof Error?error.message:String(error);
    return;
  }
  const rationale=proposal.rationale.trim();
  const evidence=proposal.evidence;
  const values=proposal.values;
  const variation=proposal.variation;
  if(rationale===""||evidence.length===0){
    shadowRun.title="Rationale and at least one evidence reference are required";
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

async function decideVisualReview(experiment,decision,button){
  const label=decision==="supports_candidate"?"Accept":"Reject";
  if(!window.confirm(label+" this visual review? Scoring will be locked until you Reopen it."))return;
  setBlockingButtonState(button,true,{
    label,
    tooltip:label+" visual review",
    busyLabel:decision==="supports_candidate"?"Accepting":"Rejecting",
    busyTooltip:(decision==="supports_candidate"?"Accepting":"Rejecting")+" visual review",
  });
  try{
    const response=await fetch(
      "/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/review/decision",
      {
        method:"POST",
        headers:{Accept:"application/json","content-type":"application/json"},
        body:JSON.stringify({decision}),
      },
    );
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    if(reportDialog?.open)void loadVisualReview({...experiment,review:{...experiment.review,decision}});
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(button,false,{
      label,
      tooltip:error instanceof Error?error.message:String(error),
    });
  }
}

async function reopenVisualReview(experiment,button){
  if(!window.confirm("Reopen this review? Scores and notes will become editable again."))return;
  setBlockingButtonState(button,true,{
    label:"Reopen",
    tooltip:"Unlock scoring and notes",
    busyLabel:"Reopening",
    busyTooltip:"Reopening visual review",
  });
  try{
    const response=await fetch(
      "/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/review/reopen",
      {method:"POST",headers:{Accept:"application/json"}},
    );
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(button,false,{
      label:"Reopen",
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
      "Approval records immutable human authority evidence. Admit is the separate action that makes this the next append-only calibration version.",
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

async function admitCalibration(experiment,button){
  setBlockingButtonState(button,true,{
    label:"Admit",
    tooltip:"Admit this approved calibration as the next immutable version",
    busyLabel:"Admitting",
    busyTooltip:"Writing immutable calibration authority",
  });
  try{
    const response=await fetch(
      "/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/admission",
      {method:"POST",headers:{Accept:"application/json"}},
    );
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
    await loadAppearanceCoverage({quiet:true});
    await loadAppearanceExperiments();
  }catch(error){
    setBlockingButtonState(button,false,{
      label:"Admit",
      tooltip:error instanceof Error?error.message:String(error),
    });
  }
}

function experimentById(experimentId){
  return experimentSnapshot.find(experiment=>experiment.experimentId===experimentId)??null;
}

function numericalExperimentReportUrl(experimentId){
  return experimentReportUrl(experimentId)+"?kind=numerical";
}

function comparisonChangeNode(change){
  const node=el("span","appearance-compare-change");
  const before=Number.isFinite(change?.before)?String(change.before):"current";
  const after=Number.isFinite(change?.after)?String(change.after):"—";
  node.append(
    el("strong",null,change?.parameter??"parameter"),
    document.createTextNode(" "+before+" → "+after),
  );
  if(Number.isFinite(change?.baselineMean)&&Number.isFinite(change?.shadowMean)){
    node.append(el("em",null," · mean "+change.baselineMean.toFixed(3)+" → "+change.shadowMean.toFixed(3)));
  }
  return node;
}

function comparisonNumber(value,{integer=false}={}){
  if(!Number.isFinite(value))return "—";
  if(integer)return String(Math.round(value));
  const rounded=Math.round(value*1000)/1000;
  return Object.is(rounded,-0)?"0":String(rounded);
}

function comparisonDelta(before,after,{integer=false}={}){
  if(!Number.isFinite(before)||!Number.isFinite(after))return {text:"—",different:false};
  const delta=after-before;
  const different=integer?delta!==0:Math.abs(delta)>=.0005;
  if(!different)return {text:"0",different:false};
  const value=integer?Math.round(delta):Math.round(delta*1000)/1000;
  return {text:(value>0?"+":"")+value,different:true};
}

function comparisonMatrixRow({label,before,after,integer=false,forceDifferent=false,delta=true}){
  const row=el("div","appearance-compare-matrix-row");
  const change=comparisonDelta(before,after,{integer});
  const different=forceDifferent||change.different;
  const labelNode=el("div","appearance-compare-matrix-label",label);
  const beforeNode=el("div","appearance-compare-matrix-value",comparisonNumber(before,{integer}));
  const afterNode=el(
    "div",
    "appearance-compare-matrix-value "+(different?"is-different":""),
    comparisonNumber(after,{integer}),
  );
  const deltaNode=el(
    "div",
    "appearance-compare-matrix-delta "+(different?"is-different":""),
    delta?change.text:"—",
  );
  row.append(labelNode,beforeNode,afterNode,deltaNode);
  return row;
}

function comparisonDistributionCell({center,mean,sd,p05,p95,highlight=false}={}){
  return el(
    "div",
    "appearance-compare-distribution "+(highlight?"is-different":""),
    "center "+comparisonNumber(center)
      +" · μ "+comparisonNumber(mean)
      +" · σ "+comparisonNumber(sd)
      +" · p05 "+comparisonNumber(p05)
      +" · p95 "+comparisonNumber(p95),
  );
}

function comparisonDistributionDelta(change){
  const center=comparisonDelta(change.before,change.after);
  const mean=comparisonDelta(change.baselineMean,change.shadowMean);
  const spread=comparisonDelta(change.baselineSd,change.shadowSd);
  return el(
    "div",
    "appearance-compare-distribution-delta is-different",
    "center "+center.text+" · μ "+mean.text+" · σ "+spread.text,
  );
}

function comparisonDistributionRow(change){
  const row=el("div","appearance-compare-matrix-row appearance-compare-distribution-row");
  row.append(
    el("div","appearance-compare-matrix-label",change.parameter),
    comparisonDistributionCell({
      center:change.before,
      mean:change.baselineMean,
      sd:change.baselineSd,
      p05:change.baselineP05,
      p95:change.baselineP95,
    }),
    comparisonDistributionCell({
      center:change.after,
      mean:change.shadowMean,
      sd:change.shadowSd,
      p05:change.shadowP05,
      p95:change.shadowP95,
      highlight:true,
    }),
    comparisonDistributionDelta(change),
  );
  return row;
}

function comparisonMatrixTextRow({label,before,after,different=true}){
  const row=el("div","appearance-compare-matrix-row");
  row.append(
    el("div","appearance-compare-matrix-label",label),
    el("div","appearance-compare-matrix-value",before??"—"),
    el("div","appearance-compare-matrix-value "+(different?"is-different":""),after??"—"),
    el("div","appearance-compare-matrix-delta "+(different?"is-different":""),different?"changed":"—"),
  );
  return row;
}

function comparisonMatrixHeader(baseline,shadow){
  const row=el("div","appearance-compare-matrix-row appearance-compare-matrix-columns");
  row.append(
    el("div","appearance-compare-matrix-label","Metric"),
    el("div","appearance-compare-matrix-value","Baseline"),
    el("div","appearance-compare-matrix-value","Refinement"),
    el("div","appearance-compare-matrix-delta","Δ"),
  );
  row.children[1].title=baseline?populationLabExperimentName(baseline):"Baseline";
  row.children[2].title=shadow?populationLabExperimentName(shadow):"Refinement";
  return row;
}

function renderNumericalComparison(){
  if(!comparisonState)return;
  const baseline=experimentById(comparisonState.baselineExperimentId);
  const shadow=experimentById(comparisonState.shadowExperimentId);

  if(compareParameterMatrix){
    compareParameterMatrix.replaceChildren(comparisonMatrixHeader(baseline,shadow));
    for(const change of comparisonState.changes??[]){
      if(change.kind==="variation"){
        compareParameterMatrix.append(comparisonMatrixTextRow({
          label:change.parameter,
          before:"baseline",
          after:comparisonNumber(change.after),
        }));
        continue;
      }
      compareParameterMatrix.append(comparisonDistributionRow(change));
    }
  }

  if(compareHealthMatrix){
    compareHealthMatrix.replaceChildren(comparisonMatrixHeader(baseline,shadow));
    for(const metric of comparisonState.health??[]){
      compareHealthMatrix.append(comparisonMatrixRow({
        label:metric.metric,
        before:metric.baseline,
        after:metric.shadow,
        integer:metric.integer===true,
      }));
    }
  }
}

function visualComparisonSampleSize(baseline,shadow){
  if(
    comparisonState?.sameCohort!==true
    ||baseline?.visual?.status!=="completed"
    ||shadow?.visual?.status!=="completed"
  )return 0;
  const baselineSize=Number(baseline.visual?.sampleSize??baseline.visual?.summary?.sampleSize);
  const shadowSize=Number(shadow.visual?.sampleSize??shadow.visual?.summary?.sampleSize);
  if(!Number.isInteger(baselineSize)||baselineSize<1||baselineSize!==shadowSize)return 0;
  return baselineSize;
}

function comparisonImageUrl(experimentId,ordinal,role){
  return "/api/appearance/experiments/"
    +encodeURIComponent(experimentId)
    +"/image/"
    +String(ordinal).padStart(3,"0")
    +"/"
    +role;
}

const EYE_ALIGNMENT_STEPS=Object.freeze([
  Object.freeze({key:"beforeLeft",side:"before",eye:"L",label:"Before · click the image-left eye"}),
  Object.freeze({key:"beforeRight",side:"before",eye:"R",label:"Before · click the image-right eye"}),
  Object.freeze({key:"afterLeft",side:"after",eye:"L",label:"After · click the image-left eye"}),
  Object.freeze({key:"afterRight",side:"after",eye:"R",label:"After · click the image-right eye"}),
]);

function eyeAlignmentAvailability(){
  const changes=comparisonState?.changes??[];
  if(changes.some(change=>change?.kind==="variation")){
    return Object.freeze({
      allowed:false,
      reason:"Eye alignment is disabled when variation changes because scale normalization could hide real phenotype spread.",
    });
  }
  if(changes.some(change=>change?.parameter==="eyeSpacing")){
    return Object.freeze({
      allowed:false,
      reason:"Eye alignment is disabled because eyeSpacing is itself part of this refinement.",
    });
  }
  return Object.freeze({allowed:true,reason:null});
}

function comparisonEyeAlignmentKey(ordinal){
  return comparisonVisualRole+":"+ordinal;
}

function comparisonEyeAlignmentUrl(ordinal){
  if(!comparisonState?.shadowExperimentId)throw new Error("shadow comparison is not open");
  return "/api/appearance/experiments/"
    +encodeURIComponent(comparisonState.shadowExperimentId)
    +"/alignment/"
    +comparisonVisualRole
    +"/"
    +String(ordinal).padStart(3,"0");
}

async function persistEyeAlignment(ordinal,points){
  const response=await fetch(comparisonEyeAlignmentUrl(ordinal),{
    method:"POST",
    headers:{Accept:"application/json","Content-Type":"application/json"},
    body:JSON.stringify(points),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
  return payload?.alignment??points;
}

async function deleteEyeAlignment(ordinal){
  const response=await fetch(comparisonEyeAlignmentUrl(ordinal),{
    method:"DELETE",
    headers:{Accept:"application/json"},
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
  return payload;
}

function comparisonEyeAlignment(ordinal){
  if(!eyeAlignmentAvailability().allowed)return null;
  return comparisonEyeAlignments.get(comparisonEyeAlignmentKey(ordinal))??null;
}

function comparisonEyePoint(event,image){
  const rect=image.getBoundingClientRect();
  return normalizedImagePoint({
    x:event.clientX-rect.left,
    y:event.clientY-rect.top,
    width:rect.width,
    height:rect.height,
    naturalWidth:image.naturalWidth,
    naturalHeight:image.naturalHeight,
  });
}

function positionEyeMarker(marker,image,point){
  if(!marker||!image||!point||!image.complete||image.naturalWidth<1)return;
  const rect=image.getBoundingClientRect();
  const displayed=displayedImagePoint(point,{
    width:rect.width,
    height:rect.height,
    naturalWidth:image.naturalWidth,
    naturalHeight:image.naturalHeight,
  });
  marker.style.left=displayed.x+"px";
  marker.style.top=displayed.y+"px";
}

function alignmentTransformForReveal(reveal,before,after,alignment){
  const rect=reveal.getBoundingClientRect();
  if(
    rect.width<=0||rect.height<=0
    ||before.naturalWidth<1||before.naturalHeight<1
    ||after.naturalWidth<1||after.naturalHeight<1
  )return null;
  const beforeDimensions={
    width:rect.width,
    height:rect.height,
    naturalWidth:before.naturalWidth,
    naturalHeight:before.naturalHeight,
  };
  const afterDimensions={
    width:rect.width,
    height:rect.height,
    naturalWidth:after.naturalWidth,
    naturalHeight:after.naturalHeight,
  };
  return eyeSimilarityTransform({
    beforeLeft:displayedImagePoint(alignment.beforeLeft,beforeDimensions),
    beforeRight:displayedImagePoint(alignment.beforeRight,beforeDimensions),
    afterLeft:displayedImagePoint(alignment.afterLeft,afterDimensions),
    afterRight:displayedImagePoint(alignment.afterRight,afterDimensions),
  });
}

function startEyeAlignment(ordinal){
  if(!eyeAlignmentAvailability().allowed)return;
  comparisonEyeAlignmentEditor={
    ordinal,
    role:comparisonVisualRole,
    step:0,
    points:{},
    error:null,
  };
  renderVisualComparison();
  requestAnimationFrame(()=>{
    compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]')?.scrollIntoView({block:"start"});
  });
}

async function resetEyeAlignment(ordinal){
  try{
    await deleteEyeAlignment(ordinal);
    comparisonEyeAlignments.delete(comparisonEyeAlignmentKey(ordinal));
    if(comparisonEyeAlignmentEditor?.ordinal===ordinal)comparisonEyeAlignmentEditor=null;
    renderVisualComparison();
    requestAnimationFrame(()=>{
      compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]')?.scrollIntoView({block:"start"});
    });
  }catch(error){
    const sample=compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]');
    if(sample)sample.title=error instanceof Error?error.message:String(error);
  }
}

function cancelEyeAlignment(ordinal){
  if(comparisonEyeAlignmentEditor?.ordinal===ordinal)comparisonEyeAlignmentEditor=null;
  renderVisualComparison();
  requestAnimationFrame(()=>{
    compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]')?.scrollIntoView({block:"start"});
  });
}

function eyeAlignmentEditorPanel({side,src,ordinal}){
  const session=comparisonEyeAlignmentEditor;
  const step=EYE_ALIGNMENT_STEPS[session?.step??0];
  const panel=el("button","appearance-eye-align-panel"+(step?.side===side?" is-active":""));
  panel.type="button";
  panel.disabled=step?.side!==side;
  panel.setAttribute("aria-label",step?.side===side?step.label:(side==="before"?"Before image":"After image"));

  const image=document.createElement("img");
  image.src=src;
  image.alt=(side==="before"?"Before":"After")+" Sample "+ordinal+" "+comparisonVisualRole;
  image.draggable=false;

  const label=el("span","appearance-eye-align-panel-label",side==="before"?"Before":"After");
  const markers=el("div","appearance-eye-align-markers");
  const prefix=side==="before"?"before":"after";
  for(const [key,eye] of [[prefix+"Left","L"],[prefix+"Right","R"]]){
    const point=session?.points?.[key];
    if(!point)continue;
    const marker=el("span","appearance-eye-align-marker",eye);
    markers.append(marker);
    const place=()=>positionEyeMarker(marker,image,point);
    image.addEventListener("load",place,{once:true});
    requestAnimationFrame(place);
  }

  panel.append(image,markers,label);
  panel.addEventListener("click",async(event)=>{
    if(!session||step?.side!==side||image.naturalWidth<1)return;
    const point=comparisonEyePoint(event,image);
    if(point===null){
      session.error="Click inside the rendered face image";
      renderVisualComparison();
      return;
    }
    session.points[step.key]=point;
    session.error=null;
    if(session.step<EYE_ALIGNMENT_STEPS.length-1){
      session.step+=1;
      renderVisualComparison();
      requestAnimationFrame(()=>{
        compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]')?.scrollIntoView({block:"start"});
      });
      return;
    }

    try{
      const transform=eyeSimilarityTransform({
        beforeLeft:session.points.beforeLeft,
        beforeRight:session.points.beforeRight,
        afterLeft:session.points.afterLeft,
        afterRight:session.points.afterRight,
      });
      if(transform.scale<.6||transform.scale>1.65||Math.abs(transform.rotation)>.45){
        throw new Error("Eye alignment looks implausible; mark the four eye centers again");
      }
      const saved=await persistEyeAlignment(ordinal,session.points);
      comparisonEyeAlignments.set(comparisonEyeAlignmentKey(ordinal),Object.freeze({...saved}));
      comparisonEyeAlignmentEditor=null;
      renderVisualComparison();
      requestAnimationFrame(()=>{
        compareVisualBody?.querySelector('[data-compare-sample="'+ordinal+'"]')?.scrollIntoView({block:"start"});
      });
    }catch(error){
      session.step=0;
      session.points={};
      session.error=error instanceof Error?error.message:String(error);
      renderVisualComparison();
    }
  });
  return panel;
}

function comparisonEyeAlignmentEditorNode({beforeSrc,afterSrc,ordinal}){
  const session=comparisonEyeAlignmentEditor;
  const editor=el("div","appearance-eye-align-editor");
  const instruction=el("div","appearance-eye-align-instruction");
  instruction.append(
    el("strong",null,EYE_ALIGNMENT_STEPS[session?.step??0]?.label??"Align eyes"),
    el("span",null,"Mark eye centers only. Fibre will match eye midpoint, distance, and tilt."),
  );
  if(session?.error)instruction.append(el("em",null,session.error));

  const actions=el("div","appearance-eye-align-actions");
  const cancel=el("button","secondary","Cancel");
  cancel.type="button";
  cancel.addEventListener("click",()=>cancelEyeAlignment(ordinal));
  actions.append(cancel);
  instruction.append(actions);

  const panels=el("div","appearance-eye-align-panels");
  panels.append(
    eyeAlignmentEditorPanel({side:"before",src:beforeSrc,ordinal}),
    eyeAlignmentEditorPanel({side:"after",src:afterSrc,ordinal}),
  );
  editor.append(instruction,panels);
  return editor;
}

function comparisonReveal({beforeSrc,afterSrc,ordinal}){
  const reveal=el("div","appearance-compare-reveal");
  reveal.style.setProperty("--reveal","50%");

  const before=document.createElement("img");
  before.className="appearance-compare-reveal-before";
  before.src=beforeSrc;
  before.alt="Before Sample "+ordinal+" "+comparisonVisualRole;
  before.loading="lazy";

  const afterLayer=el("div","appearance-compare-reveal-after");
  const after=document.createElement("img");
  after.src=afterSrc;
  after.alt="After Sample "+ordinal+" "+comparisonVisualRole;
  after.loading="lazy";
  afterLayer.append(after);

  const alignment=comparisonEyeAlignment(ordinal);
  if(alignment){
    const applyAlignment=()=>{
      const transform=alignmentTransformForReveal(reveal,before,after,alignment);
      if(transform===null)return;
      after.style.transformOrigin="0 0";
      after.style.transform=cssSimilarityMatrix(transform);
    };
    before.addEventListener("load",applyAlignment);
    after.addEventListener("load",applyAlignment);
    requestAnimationFrame(applyAlignment);
    if(typeof ResizeObserver==="function"){
      const observer=new ResizeObserver(()=>{
        if(!reveal.isConnected){
          observer.disconnect();
          return;
        }
        applyAlignment();
      });
      observer.observe(reveal);
    }
    reveal.classList.add("is-eye-aligned");
  }

  const divider=el("div","appearance-compare-reveal-divider");
  divider.append(el("span","appearance-compare-reveal-handle","↔"));

  const beforeLabel=el("span","appearance-compare-reveal-label is-before","Before");
  const afterLabel=el("span","appearance-compare-reveal-label is-after","After");

  const slider=document.createElement("input");
  slider.className="appearance-compare-reveal-range";
  slider.type="range";
  slider.min="0";
  slider.max="100";
  slider.value="50";
  slider.step="1";
  slider.setAttribute("aria-label","Reveal refinement for Sample "+ordinal);
  slider.addEventListener("input",()=>{
    reveal.style.setProperty("--reveal",slider.value+"%");
  });

  reveal.append(before,afterLayer,divider,beforeLabel,afterLabel,slider);
  return reveal;
}

function renderVisualComparison(){
  if(!compareVisualBody||!comparisonState)return;
  const baseline=experimentById(comparisonState.baselineExperimentId);
  const shadow=experimentById(comparisonState.shadowExperimentId);
  const sampleSize=visualComparisonSampleSize(baseline,shadow);
  compareVisualBody.replaceChildren();

  if(sampleSize===0){
    compareVisualBody.append(el(
      "div",
      "appearance-compare-visual-empty",
      comparisonState.sameCohort!==true
        ?"Visual comparison is unavailable because baseline and refinement are not the same deterministic cohort."
        :"Generate matching visual evidence for both baseline and refinement before comparing images.",
    ));
    return;
  }

  for(let ordinal=1;ordinal<=sampleSize;ordinal+=1){
    const sample=el("article","appearance-compare-visual-sample");
    sample.dataset.compareSample=String(ordinal);
    const head=el("div","appearance-compare-visual-sample-head");
    const headCopy=el("div","appearance-compare-visual-sample-copy");
    headCopy.append(
      el("strong",null,"Sample "+ordinal+" of "+sampleSize),
      el("span",null,(comparisonVisualRole==="geometry"?"Geometry":"Portrait")+" · same deterministic cohort person"),
    );
    head.append(headCopy);

    const beforeSrc=comparisonImageUrl(baseline.experimentId,ordinal,comparisonVisualRole);
    const afterSrc=comparisonImageUrl(shadow.experimentId,ordinal,comparisonVisualRole);
    const editing=comparisonEyeAlignmentEditor?.ordinal===ordinal
      && comparisonEyeAlignmentEditor?.role===comparisonVisualRole;
    const alignment=comparisonEyeAlignment(ordinal);

    if(comparisonVisualMode==="reveal"){
      const actions=el("div","appearance-compare-visual-sample-actions");
      if(editing){
        actions.append(el("span","appearance-eye-align-status","Aligning eyes"));
      }else{
        const availability=eyeAlignmentAvailability();
        if(alignment)actions.append(el("span","appearance-eye-align-status","Aligned"));
        const align=el("button","secondary",alignment?"Re-align eyes":"Align eyes");
        align.type="button";
        align.disabled=!availability.allowed;
        align.title=availability.reason??"Match eye midpoint, scale, and tilt for visual inspection only";
        align.addEventListener("click",()=>startEyeAlignment(ordinal));
        actions.append(align);
        if(alignment){
          const reset=el("button","secondary","Reset");
          reset.type="button";
          reset.addEventListener("click",()=>void resetEyeAlignment(ordinal));
          actions.append(reset);
        }
      }
      head.append(actions);
      sample.append(
        head,
        editing
          ?comparisonEyeAlignmentEditorNode({beforeSrc,afterSrc,ordinal})
          :comparisonReveal({beforeSrc,afterSrc,ordinal}),
      );
    }else{
      const pair=el("div","appearance-compare-visual-pair");
      for(const [label,src] of [["Before",beforeSrc],["After",afterSrc]]){
        const figure=document.createElement("figure");
        if(label==="After")figure.classList.add("is-refinement");
        const caption=el("figcaption",null);
        caption.append(
          el("span",null,label),
          el("strong",null,comparisonVisualRole==="geometry"?"Geometry":"Portrait"),
        );
        const image=document.createElement("img");
        image.src=src;
        image.alt=label+" Sample "+ordinal+" "+comparisonVisualRole;
        image.loading="lazy";
        image.dataset.lightboxSrc=src;
        image.dataset.lightboxAlt=image.alt;
        figure.append(caption,image);
        pair.append(figure);
      }
      sample.append(head,pair);
    }
    compareVisualBody.append(sample);
  }
}

function setComparisonView(view){
  comparisonView=view==="visual"?"visual":"numerical";
  const visual=comparisonView==="visual";
  if(compareNumericalBody)compareNumericalBody.hidden=visual;
  if(compareVisualBody)compareVisualBody.hidden=!visual;
  if(compareVisualRole)compareVisualRole.hidden=!visual;
  compareNumericalButton?.classList.toggle("is-active",!visual);
  compareVisualButton?.classList.toggle("is-active",visual);
  if(visual){
    renderVisualComparison();
    compareVisualBody?.scrollTo({top:0,behavior:"instant"});
  }else renderNumericalComparison();
}

function setComparisonVisualRole(role){
  comparisonEyeAlignmentEditor=null;
  comparisonVisualRole=role==="portrait"?"portrait":"geometry";
  compareGeometryButton?.classList.toggle("is-active",comparisonVisualRole==="geometry");
  comparePortraitButton?.classList.toggle("is-active",comparisonVisualRole==="portrait");
  if(comparisonView==="visual"){
    renderVisualComparison();
    compareVisualBody?.scrollTo({top:0,behavior:"instant"});
  }
}

function setComparisonVisualMode(mode){
  comparisonEyeAlignmentEditor=null;
  comparisonVisualMode=mode==="side-by-side"?"side-by-side":"reveal";
  compareRevealButton?.classList.toggle("is-active",comparisonVisualMode==="reveal");
  compareSideBySideButton?.classList.toggle("is-active",comparisonVisualMode==="side-by-side");
  if(comparisonView==="visual"){
    renderVisualComparison();
    compareVisualBody?.scrollTo({top:0,behavior:"instant"});
  }
}

function refreshComparisonViewAvailability(){
  if(!comparisonState)return;
  const baseline=experimentById(comparisonState.baselineExperimentId);
  const shadow=experimentById(comparisonState.shadowExperimentId);
  const ready=visualComparisonSampleSize(baseline,shadow)>0;
  if(compareVisualButton){
    compareVisualButton.disabled=!ready;
    compareVisualButton.title=ready
      ?"Compare the same deterministic samples before and after refinement"
      :"Visual comparison requires completed matching visuals for baseline and refinement";
  }
  if(!ready&&comparisonView==="visual")setComparisonView("numerical");
  else if(comparisonView==="visual")renderVisualComparison();
}

function visualActionButton(experiment){
  const visualActive=["queued","running"].includes(experiment.visual?.status);
  const visualRetryable=experiment.visual?.status==="failed"&&!experiment.visual?.startedAt;
  if(experiment.status!=="completed"||(!visualActive&&experiment.visual&&!visualRetryable))return null;

  const button=el("button","secondary appearance-visual-action");
  const progress=visualProgress(experiment);
  button.type="button";
  button.disabled=visualActive;
  decorateActionButton(button,{
    icon:visualActive?"rotate":"image",
    label:visualActive?"Progress "+(progress?.completed??0)+"/"+(progress?.total??8):visualRetryable?"Retry visuals":"Run visuals",
    tooltip:visualActive
      ?"Generating images: "+(progress?.completed??0)+"/"+(progress?.total??8)
      :visualRetryable
        ?"Retry the same visual manifest; the prior Workflow never started"
        :"Generate 4 geometry anchors and 4 reference-conditioned portraits",
    spinning:visualActive,
  });
  if(visualActive)return button;

  button.addEventListener("click",async()=>{
    if(!window.confirm(visualRetryable
      ?"Retry the same visual fidelity run? The prior Workflow never started, so this will reuse the exact immutable manifest."
      :"Run the 4-person visual fidelity sample? This generates 8 images through Asset Generator."))return;
    setBlockingButtonState(button,true,{
      label:visualRetryable?"Retry visuals":"Run visuals",
      tooltip:"Generate visual fidelity evidence",
      busyLabel:"Queueing",
      busyTooltip:"Queueing visual fidelity experiment",
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
      setBlockingButtonState(button,false,{
        label:visualRetryable?"Retry visuals":"Run visuals",
        tooltip:error instanceof Error?error.message:String(error),
        icon:"image",
      });
    }
  });
  return button;
}

function renderComparisonActions(experiment){
  if(!compareActions)return;
  compareActions.replaceChildren();
  if(!experiment)return;

  const visualButton=visualActionButton(experiment);
  if(visualButton)compareActions.append(visualButton);

  if(experiment.visual?.status==="completed"){
    const review=el("button","secondary");
    review.type="button";
    const decision=experiment.review?.decision??null;
    const label=!decision?"Score visuals":decision==="open"?"Edit scoring":"View review";
    decorateActionButton(review,{
      icon:"image",
      label,
      tooltip:decision==="open"
        ?"Edit saved visual scores and notes"
        :decision
          ?"View the locked visual review"
          :"Score visual fidelity before accepting or rejecting",
    });
    review.addEventListener("click",()=>openExperimentReport(experiment));
    compareActions.append(review);
  }

  const reviewState=reviewStatus(experiment.review);
  if(reviewState)compareActions.append(experimentStatusPill(reviewState));

  const decision=experiment.review?.decision??null;
  const candidateFrozen=Boolean(experiment.artifacts?.calibrationCandidate?.objectRef);

  if(decision==="open"&&!candidateFrozen){
    const accept=el("button","primary");
    accept.type="button";
    decorateActionButton(accept,{
      label:"Accept",
      tooltip:"Accept this scored review and lock scoring until Reopen",
    });
    accept.addEventListener("click",()=>void decideVisualReview(experiment,"supports_candidate",accept));

    const reject=el("button","secondary");
    reject.type="button";
    decorateActionButton(reject,{
      label:"Reject",
      tooltip:"Reject this scored review and lock scoring until Reopen",
    });
    reject.addEventListener("click",()=>void decideVisualReview(experiment,"reject",reject));
    compareActions.append(accept,reject);
  }

  if(["supports_candidate","reject","inconclusive"].includes(decision)&&!candidateFrozen){
    const reopen=el("button","secondary");
    reopen.type="button";
    decorateActionButton(reopen,{
      icon:"rotate",
      label:"Reopen",
      tooltip:"Unlock scoring and notes for this review",
    });
    reopen.addEventListener("click",()=>void reopenVisualReview(experiment,reopen));
    compareActions.append(reopen);
  }

  if(
    experiment.status==="completed"
    && decision==="supports_candidate"
    && !candidateFrozen
  ){
    const freeze=el("button","primary");
    freeze.type="button";
    decorateActionButton(freeze,{
      icon:"wrench",
      label:"Freeze candidate",
      tooltip:"Freeze the accepted review and refinement as immutable candidate evidence",
    });
    freeze.addEventListener("click",()=>void freezeCalibrationCandidate(experiment,freeze));
    compareActions.append(freeze);
  }

  if(candidateFrozen){
    compareActions.append(experimentStatusPill({label:"Candidate Frozen",tone:"good",active:false}));
  }

  if(
    candidateFrozen
    && !experiment.artifacts?.calibrationApproval?.objectRef
  ){
    const approve=el("button","primary appearance-approval-action");
    approve.type="button";
    decorateActionButton(approve,{
      label:"Approve",
      tooltip:"Review projected impact and approve candidate evidence",
    });
    approve.addEventListener("click",()=>void approveCalibrationCandidate(experiment,approve));
    compareActions.append(approve);
  }

  if(experiment.artifacts?.calibrationApproval?.objectRef){
    compareActions.append(experimentStatusPill({label:"Approved",tone:"good",active:false}));
    const adoption=currentCalibrationAdoptions().find(item=>item.experimentId===experiment.experimentId)??null;
    if(populationLabExperimentAdmitted(adoption)){
      compareActions.append(experimentStatusPill({
        label:"Admitted @"+adoption.toVersion,
        tone:"good",
        active:false,
      }));
    }else{
      const admit=el("button","primary");
      admit.type="button";
      decorateActionButton(admit,{
        label:"Admit",
        tooltip:"Admit this approved calibration as the next immutable runtime version",
      });
      admit.addEventListener("click",()=>void admitCalibration(experiment,admit));
      compareActions.append(admit);
    }
  }

  if(decision==="reject"){
    const rerun=el("button","secondary");
    rerun.type="button";
    decorateActionButton(rerun,{
      icon:"rotate",
      label:"Run another experiment",
      tooltip:"Keep this rejected evidence and launch another deterministic run",
    });
    rerun.addEventListener("click",()=>void rerunRejectedExperiment(experiment,rerun));
    compareActions.append(rerun);
  }
}

function refreshOpenComparison(){
  if(!compareDialog?.open||!comparisonState)return;
  const experiment=experimentById(comparisonState.shadowExperimentId);
  if(experiment)renderComparisonActions(experiment);
  refreshComparisonViewAvailability();
}

async function openExperimentComparison(experiment){
  if(!compareDialog||!experiment?.experimentId)return;
  const response=await fetch(
    "/api/appearance/experiments/"+encodeURIComponent(experiment.experimentId)+"/compare",
    {headers:{Accept:"application/json"},cache:"no-store"},
  );
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.comparison){
    throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
  }
  const comparison=payload.comparison;
  comparisonEyeAlignments.clear();
  comparisonEyeAlignmentEditor=null;
  comparisonState=comparison;
  for(const [key,alignment] of Object.entries(comparison.comparisonAlignments??{})){
    if(alignment&&typeof alignment==="object")comparisonEyeAlignments.set(key,Object.freeze({...alignment}));
  }
  const baseline=experimentById(comparison.baselineExperimentId);
  const shadow=experimentById(comparison.shadowExperimentId)??experiment;

  if(compareTitle)compareTitle.textContent=
    (baseline?populationLabExperimentName(baseline):comparison.referencePopulation+" baseline")
    +" → "
    +populationLabExperimentName(shadow);
  if(compareChanges){
    compareChanges.replaceChildren();
    for(const change of comparison.changes??[])compareChanges.append(comparisonChangeNode(change));
  }
  renderNumericalComparison();
  if(compareBaselineReport)compareBaselineReport.onclick=()=>window.open(
    numericalExperimentReportUrl(comparison.baselineExperimentId),
    "_blank",
    "noopener",
  );
  if(compareShadowReport)compareShadowReport.onclick=()=>window.open(
    numericalExperimentReportUrl(comparison.shadowExperimentId),
    "_blank",
    "noopener",
  );
  comparisonView="numerical";
  comparisonVisualRole="geometry";
  comparisonVisualMode="reveal";
  setComparisonVisualRole("geometry");
  setComparisonVisualMode("reveal");
  setComparisonView("numerical");
  renderComparisonActions(shadow);
  refreshComparisonViewAvailability();
  if(!compareDialog.open)compareDialog.showModal();
}

function currentCalibrationAdoptions(){
  return populationLabAdoptions(experimentSnapshot,{
    model:snapshot?.model??[],
    migrationCandidates:pendingCandidateList(),
  });
}

function threadLabel(threadId){
  const lineage=(snapshot?.lineages??[]).find(item=>item?.threadId===threadId);
  return lineage?.threadName??threadId;
}

function adoptionTone(state){
  if(state==="converged")return "good";
  if(state==="affected"||state==="admission_required")return "warn";
  return "neutral";
}

function adoptionLabel(state){
  if(state==="admission_required")return "Admission required";
  if(state==="affected")return "Affected";
  if(state==="converged")return "A5 complete";
  return human(state);
}

function adoptionStep(label,{done=false,active=false,detail=""}={}){
  const node=el("div","appearance-adoption-step"+(done?" is-done":"")+(active?" is-active":""));
  node.append(
    el("span","appearance-adoption-step-mark",done?"✓":active?"•":"○"),
    el("strong",null,label),
  );
  if(detail)node.append(el("em",null,detail));
  return node;
}

function adoptionEvidence(adoption){
  return Object.freeze({
    contract:"fibre-population-lab-adoption-evidence-v0.1",
    experimentId:adoption.experimentId,
    referencePopulation:adoption.referencePopulation,
    fromVersion:adoption.fromVersion,
    toVersion:adoption.toVersion,
    currentVersion:adoption.currentVersion,
    projectedThreadIds:adoption.projectedThreadIds,
    projectedThreadCount:adoption.projectedThreadCount,
    remainingThreadIds:adoption.remainingThreadIds,
    remainingThreadCount:adoption.remainingThreadCount,
    state:adoption.state,
    observedAt:new Date().toISOString(),
  });
}

function renderCalibrationAdoptions(){
  if(!adoptionList)return;
  adoptionList.replaceChildren();
  const states=currentCalibrationAdoptions();
  if(states.length===0){
    adoptionList.append(el("div","empty","Approve a reviewed refinement to begin adoption."));
    return;
  }

  for(const adoption of states){
    const experiment=experimentById(adoption.experimentId);
    if(!experiment)continue;

    const card=el("article","appearance-adoption-card");
    card.dataset.adoptionState=adoption.state;

    const head=el("div","appearance-adoption-head");
    const title=el("div","appearance-adoption-title");
    title.append(
      el("strong",null,adoption.referencePopulation),
      el("span",null,"@"+adoption.fromVersion+" → @"+adoption.toVersion),
    );
    head.append(
      title,
      experimentStatusPill({
        label:adoptionLabel(adoption.state),
        tone:adoptionTone(adoption.state),
        active:adoption.state==="affected"&&Boolean(migrationBatch),
      }),
    );

    const steps=el("div","appearance-adoption-steps");
    steps.append(
      adoptionStep("Approved",{done:true,detail:"human authority"}),
      adoptionStep("Admitted",{
        done:adoption.admitted,
        active:!adoption.admitted,
        detail:adoption.admitted
          ? "@"+adoption.currentVersion+(adoption.superseded?" current":" live")
          : "registry @"+(adoption.currentVersion??"—"),
      }),
      adoptionStep("Affected",{
        done:adoption.admitted&&adoption.remainingThreadCount===0,
        active:adoption.state==="affected",
        detail:adoption.admitted
          ? adoption.remainingThreadCount+" remaining / "+adoption.projectedThreadCount+" projected"
          : adoption.projectedThreadCount+" projected",
      }),
      adoptionStep("Converged",{
        done:adoption.state==="converged",
        active:false,
        detail:adoption.state==="converged"?"World current":"pending",
      }),
    );

    const people=el("div","appearance-adoption-people");
    const projected=adoption.projectedThreadIds??[];
    people.append(el("strong",null,"Affected Threads"));
    if(projected.length===0){
      people.append(el("span","appearance-adoption-none","No existing Thread is projected to require migration."));
    }else{
      const chips=el("div","appearance-adoption-thread-chips");
      for(const threadId of projected){
        const chip=el("button","appearance-adoption-thread-chip",threadLabel(threadId));
        chip.type="button";
        chip.title=threadId;
        chip.classList.toggle("is-remaining",adoption.remainingThreadIds.includes(threadId));
        chip.addEventListener("click",()=>{
          const row=migrations?.querySelector('[data-thread-id="'+CSS.escape(threadId)+'"]');
          row?.scrollIntoView({behavior:"smooth",block:"center"});
        });
        chips.append(chip);
      }
      people.append(chips);
    }

    const note=el("p","appearance-adoption-note");
    if(adoption.state==="admission_required"){
      note.textContent="Approval is complete. Admit this calibration to append the next runtime-authority version. No code deployment is required.";
    }else if(adoption.state==="affected"){
      note.textContent="The reviewed calibration is live. Only the marked Threads below remain stale against that deployed dependency.";
    }else{
      note.textContent="The reviewed calibration is live and every projected affected Thread has converged to current World appearance authority.";
    }

    const actions=el("div","appearance-adoption-actions");
    const compare=el("button","secondary","Compare");
    compare.type="button";
    compare.addEventListener("click",()=>void openExperimentComparison(experiment));
    actions.append(compare);

    if(adoption.state==="admission_required"){
      const admit=el("button","primary","Admit");
      admit.type="button";
      admit.addEventListener("click",()=>void admitCalibration(experiment,admit));
      actions.append(admit);
    }else if(adoption.state==="affected"){
      const targetIds=new Set(adoption.remainingThreadIds);
      const inBatch=Boolean(migrationBatch?.threadIds?.some(threadId=>targetIds.has(threadId)));
      const migrate=el("button","primary");
      migrate.type="button";
      migrate.disabled=Boolean(migrationBatch);
      decorateActionButton(migrate,{
        icon:inBatch?"rotate":"wrench",
        label:inBatch
          ?"Progress "+Math.min(migrationBatch.completed,migrationBatch.total)+"/"+migrationBatch.total
          :"Migrate "+adoption.remainingThreadCount+" affected",
        tooltip:"Migrate only the Threads affected by this deployed calibration",
        spinning:inBatch,
      });
      if(!migrate.disabled)migrate.addEventListener("click",()=>void migrateAffectedThreads(targetIds));
      actions.append(migrate);
    }else if(adoption.state==="converged"){
      const copy=el("button","secondary","Copy evidence");
      copy.type="button";
      bindCopyAction(copy,{
        value:()=>adoptionEvidence(adoption),
        label:"Copy evidence",
        tooltip:"Copy A5 adoption/convergence evidence",
        copiedLabel:"Evidence copied",
        failedLabel:"Copy failed",
        iconOnly:false,
      });
      actions.append(copy);
    }

    card.append(head,steps,people,note,actions);
    adoptionList.append(card);
  }
}

function currentCalibrationHistoryGroups(){
  return populationLabCalibrationHistoryGroups(snapshot?.calibrationHistory??[],experimentSnapshot);
}

function historyChanges(version){
  const values=Object.entries(version?.changes?.values??{})
    .map(([key,value])=>key+" "+comparisonNumber(value));
  const variation=Object.entries(version?.changes?.variation??{})
    .map(([key,value])=>key+" "+comparisonNumber(value));
  return [...values,...variation];
}

function currentHistoryBaselineExperiment(group){
  const current=group?.versions?.find(version=>version?.current===true)??null;
  if(current===null)return null;
  const experimentId=current.admissionExperimentId??current.reportExperimentId??null;
  return experimentId?experimentById(experimentId):null;
}

function openHistoricalShadow(group,version){
  const baseline=currentHistoryBaselineExperiment(group);
  if(baseline===null)throw new Error("Current admitted calibration evidence is unavailable");
  const draft=populationLabHistoryShadowDraft(group,version);
  if(Object.keys(draft.values).length===0&&Object.keys(draft.variation).length===0){
    throw new Error("Historical baseline is equivalent to the current calibration");
  }
  openShadowCalibrationDialog(baseline);
  applyImportedShadowProposal(draft);
  if(shadowContext)shadowContext.textContent=
    group.id+" · current @"+group.currentVersion+" → historical @"+version.version+" as shadow";
}

function renderCalibrationHistory(){
  if(!calibrationHistory)return;
  calibrationHistory.replaceChildren();
  const groups=currentCalibrationHistoryGroups();
  if(groups.length===0){
    calibrationHistory.append(el("div","empty","No admitted calibration history yet."));
    return;
  }

  for(const group of groups){
    const shell=document.createElement("details");
    shell.className="appearance-history-group";
    shell.open=true;

    const summary=document.createElement("summary");
    const summaryCopy=el("div","appearance-history-summary-copy");
    summaryCopy.append(
      el("strong",null,group.id),
      el("span",null,group.versions.length+" baselines · current @"+group.currentVersion),
    );
    summary.append(summaryCopy);
    shell.append(summary);

    const timeline=el("div","appearance-history-timeline");
    for(const version of [...group.versions].reverse()){
      const row=el("article","appearance-history-row"+(version.current?" is-current":""));
      const markerNode=el("div","appearance-history-marker",version.current?"●":"○");
      const body=el("div","appearance-history-body");
      const head=el("div","appearance-history-head");
      const title=el("div","appearance-history-title");
      title.append(
        el("strong",null,"@"+version.version),
        version.current
          ?experimentStatusPill({label:"Current",tone:"good",active:false})
          :version.origin
            ?experimentStatusPill({label:"Origin",tone:"",active:false})
            :experimentStatusPill({label:"Admitted",tone:"good",active:false}),
      );
      const approvedAt=version.evidence?.approvedAt;
      if(approvedAt)title.append(el("span","appearance-history-date",new Date(approvedAt).toLocaleString()));
      head.append(title);

      const actions=el("div","appearance-history-actions");
      const admissionExperiment=version.admissionExperimentId
        ?experimentById(version.admissionExperimentId)
        :null;
      const reportExperiment=version.reportExperimentId
        ?experimentById(version.reportExperimentId)
        :null;

      if(admissionExperiment){
        const compare=el("button","secondary appearance-compare-action");
        compare.type="button";
        decorateActionButton(compare,{
          icon:"wrench",
          label:"Compare",
          tooltip:"Compare this admitted baseline with the baseline before it",
        });
        compare.addEventListener("click",async()=>{
          try{
            await openExperimentComparison(admissionExperiment);
          }catch(error){
            compare.title=error instanceof Error?error.message:String(error);
          }
        });
        actions.append(compare);
      }

      if(reportExperiment){
        const report=el("button","secondary","Report");
        report.type="button";
        report.title="Open retained Population Lab evidence for this baseline";
        report.addEventListener("click",()=>openExperimentReport(reportExperiment));
        actions.append(report);
      }

      if(!version.current){
        const shadow=el("button","secondary");
        shadow.type="button";
        decorateActionButton(shadow,{
          icon:"wrench",
          label:"Try as shadow",
          tooltip:"Use this historical baseline as a proposed new calibration against current authority",
        });
        shadow.addEventListener("click",()=>{
          try{openHistoricalShadow(group,version)}
          catch(error){shadow.title=error instanceof Error?error.message:String(error)}
        });
        actions.append(shadow);
      }

      const copy=el("button","secondary");
      copy.type="button";
      bindCopyAction(copy,{
        value:()=>populationLabHistoryDraft(group,version),
        label:"Copy JSON",
        tooltip:"Copy this baseline's local values as a starting point for a refinement",
        copiedLabel:"JSON copied",
        failedLabel:"Copy failed",
        iconOnly:false,
      });
      actions.append(copy);
      head.append(actions);

      const changes=historyChanges(version);
      const changeRow=el("div","appearance-history-changes");
      if(version.origin){
        changeRow.append(el(
          "span",
          "appearance-history-origin",
          "Built-in baseline · "+Object.keys(version.values??{}).length+" local value"
            +(Object.keys(version.values??{}).length===1?"":"s"),
        ));
      }else if(changes.length===0){
        changeRow.append(el("span","appearance-history-origin","No local-value delta recorded."));
      }else{
        for(const change of changes)changeRow.append(el("code",null,change));
      }

      const valueDetails=document.createElement("details");
      valueDetails.className="appearance-history-values";
      const valueSummary=document.createElement("summary");
      valueSummary.textContent="Values";
      const valuePre=el("pre","appearance-action-json",JSON.stringify({
        values:version.values??{},
        variation:version.variation??{},
      },null,2));
      valueDetails.append(valueSummary,valuePre);

      body.append(head,changeRow,valueDetails);
      row.append(markerNode,body);
      timeline.append(row);
    }
    shell.append(timeline);
    calibrationHistory.append(shell);
  }
}

function renderAppearanceExperiments(){
  if(!experiments)return;
  experiments.replaceChildren();
  if(experimentSnapshot.length===0){
    experiments.append(el("div","empty","No persisted Population Lab experiments."));
    renderCalibrationHistory();
    renderCalibrationAdoptions();
    return;
  }
  const adoptionByExperiment=new Map(
    currentCalibrationAdoptions().map(adoption=>[adoption.experimentId,adoption])
  );
  const historyGroups=currentCalibrationHistoryGroups();
  const historicalExperimentIds=populationLabHistoricalExperimentIds(historyGroups);
  const activeExperiments=experimentSnapshot.filter(experiment=>!historicalExperimentIds.has(experiment.experimentId));
  if(activeExperiments.length===0){
    experiments.append(el("div","empty","No active Population Lab experiments."));
  }
  for(const {experiment,depth} of populationLabExperimentRows(activeExperiments)){
    const isRefinement=depth>0||experiment.experimentKind==="refinement"||experiment.summary?.shadow===true;
    const adoption=adoptionByExperiment.get(experiment.experimentId)??null;
    const admitted=populationLabExperimentAdmitted(adoption);
    const row=el("article",[
      "appearance-experiment",
      isRefinement?"is-refinement":"",
      admitted?"is-admitted":"",
    ].filter(Boolean).join(" "));
    const copy=el("div","appearance-experiment-copy");
    const head=el("div","appearance-experiment-head");
    head.append(
      el("strong",null,populationLabExperimentName(experiment)),
      experimentStatusPill(experimentStatus(experiment.status)),
    );
    const visualState=visualStatus(experiment.visual?.status);
    if(visualState)head.append(experimentStatusPill(visualState));
    const reviewedState=reviewStatus(experiment.review);
    if(reviewedState)head.append(experimentStatusPill(reviewedState));
    if(isRefinement)head.append(experimentStatusPill({label:"Shadow",tone:"warn",active:false}));
    if(experiment.artifacts?.calibrationCandidate?.objectRef){
      head.append(experimentStatusPill({label:"Candidate Evidence",tone:"good",active:false}));
    }
    if(experiment.artifacts?.calibrationApproval?.objectRef){
      head.append(experimentStatusPill({label:"Approved",tone:"good",active:false}));
    }
    if(admitted){
      head.append(experimentStatusPill({label:"Admitted",tone:"good",active:false}));
    }
    const meta=el("span","appearance-experiment-meta",experimentSummary(experiment));
    meta.title=experiment.experimentId;
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
    if(experiment.approval?.impact){
      meta.textContent+=" · approval impact "+experiment.approval.impact.threadCount+" Thread(s)";
    }
    copy.append(head,meta);
    if(experiment.error?.message)copy.append(el("span","appearance-experiment-error",experiment.error.message));
    if(experiment.visual?.error?.message)copy.append(el("span","appearance-experiment-error","Visuals: "+experiment.visual.error.message));

    const actions=el("div","appearance-experiment-actions");

    if(isRefinement){
      const compare=el("button","secondary appearance-compare-action");
      compare.type="button";
      compare.disabled=experiment.status!=="completed";
      decorateActionButton(compare,{
        icon:"wrench",
        label:"Compare",
        tooltip:compare.disabled
          ?"Comparison is available when the refinement experiment completes"
          :"Review baseline vs refinement and continue the calibration workflow",
      });
      if(!compare.disabled)compare.addEventListener("click",async()=>{
        compare.classList.remove("action-error");
        decorateActionButton(compare,{
          icon:"wrench",
          label:"Compare",
          tooltip:"Review baseline vs refinement and continue the calibration workflow",
        });
        try{
          await openExperimentComparison(experiment);
        }catch(error){
          compare.classList.add("action-error");
          decorateActionButton(compare,{
            icon:"wrench",
            label:"Compare failed",
            tooltip:error instanceof Error?error.message:String(error),
          });
        }
      });
      actions.append(compare);
    }else{
      if(experiment.status==="completed"){
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
      const visuals=visualActionButton(experiment);
      if(visuals)actions.append(visuals);
      if(experiment.artifacts?.report?.objectRef||experiment.artifacts?.visualReport?.objectRef){
        const open=el("button","secondary","Open report");
        open.type="button";
        open.title="Review experiment report inside Admin";
        open.addEventListener("click",()=>openExperimentReport(experiment));
        actions.append(open);
      }
    }

    const remove=el("button","secondary");
    remove.type="button";
    const terminal=!["queued","running"].includes(experiment.status)
      && !["queued","running"].includes(experiment.visual?.status);
    const retained=Boolean(experiment.artifacts?.calibrationApproval?.objectRef);
    const hasRefinements=activeExperiments.some(candidate=>
      populationLabExperimentParentId(candidate)===experiment.experimentId
    );
    remove.disabled=!terminal||retained||hasRefinements;
    decorateActionButton(remove,{
      icon:"trash-can",
      label:"Delete experiment",
      tooltip:retained
        ?"Approved calibration evidence is retained"
        :hasRefinements
          ?"Baseline is retained while refinement evidence depends on it"
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
  renderCalibrationHistory();
  renderCalibrationAdoptions();
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
      refreshOpenComparison();
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
    const queuedExperiment={
      ...(payload?.experiment??{}),
      referencePopulation:payload?.experiment?.referencePopulation??hole.referencePopulation,
    };
    panel.append(
      el("strong",null,populationLabExperimentName(queuedExperiment)+" queued"),
      el("p",null,"The controlled physical cohort is running asynchronously. Status updates automatically; open the report when complete."),
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
  renderAppearanceExperiments();
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
  renderCalibrationAdoptions();
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

async function migrateAffectedThreads(targetThreadIds=null){
  if(migrationBatch)return;
  const candidates=pendingCandidateList().filter(candidate=>
    !migrationIsBusy(candidate)
    &&(targetThreadIds===null||targetThreadIds.has(candidate.threadId))
  );
  if(candidates.length===0)return;
  if(!window.confirm(
    "Migrate "+candidates.length+" affected Thread"+(candidates.length===1?"":"s")
    +" to the current approved appearance calibration?\n\n"
    +"Each Thread keeps its durable ancestry and existing history. Migrations launch sequentially through the same World authority path used by the individual action."
  ))return;

  migrationBatch={
    completed:0,
    total:candidates.length,
    failures:[],
    threadIds:candidates.map(candidate=>candidate.threadId),
  };
  renderMigrations();
  renderCalibrationAdoptions();
  const batchKey=Date.now().toString(36);
  try{
    for(const [index,candidate] of candidates.entries()){
      try{
        const health=await requestThreadAppearanceHealth(candidate.threadId);
        const migration=threadAppearanceState(health.diagnosis).migration;
        if(!migration){
          migrationBatch.completed=index+1;
          renderMigrations();
          renderCalibrationAdoptions();
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
      renderCalibrationAdoptions();
    }
    await loadAppearanceCoverage({quiet:true});
  }finally{
    const failures=migrationBatch?.failures??[];
    migrationBatch=null;
    renderMigrations();
    renderCalibrationAdoptions();
    if(failures.length>0&&adoptionList){
      adoptionList.title=failures.length+" migration launch failure"+(failures.length===1?"":"s")+": "
        +failures.map(item=>item.threadId+" · "+item.message).join(" | ");
    }
  }
}

function renderMigrations(){
  migrations.replaceChildren();
  const candidates=pendingCandidateList();
  const affectedIds=populationLabAffectedThreadIds(currentCalibrationAdoptions());
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
    row.dataset.threadId=candidate.threadId;
    const affected=affectedIds.has(candidate.threadId);
    if(affected)row.classList.add("is-affected");
    if(busy)row.classList.add("is-pending");

    const person=threadIdentity(candidate);
    const meta=el("div","appearance-migration-meta");
    const origin=el("div","appearance-migration-origin");
    origin.append(el("strong",null,"Ethnicity"),el("span",null,migrationOrigin(candidate)));
    const birthplace=el("div","appearance-migration-place");
    birthplace.append(el("strong",null,"Birth place"),birthplaceNode(candidate.birthLocation));
    meta.append(origin,birthplace);

    const status=el("div","appearance-migration-status");
    if(affected)status.append(el("span","appearance-affected-tag","Affected"));
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
  renderCalibrationAdoptions();
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

if(shadowCopy)bindCopyAction(shadowCopy,{
  value:()=>shadowProposalFromForm(),
  label:"Copy refinement JSON",
  tooltip:"Copy complete calibration refinement JSON",
  copiedLabel:"Refinement copied",
  failedLabel:"Copy refinement failed",
  iconOnly:true,
});
if(shadowImport)decorateActionButton(shadowImport,{
  icon:"arrow-up-from-bracket",
  label:"Import JSON",
  tooltip:"Import calibration refinement JSON from the clipboard",
});
shadowImport?.addEventListener("click",()=>void importShadowProposal());
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

appearanceHelp?.addEventListener("click",()=>{
  if(appearanceHelpDialog&&!appearanceHelpDialog.open)appearanceHelpDialog.showModal();
});
appearanceHelpClose?.addEventListener("click",()=>appearanceHelpDialog?.close());
appearanceHelpDialog?.addEventListener("click",(event)=>{
  if(event.target===appearanceHelpDialog)appearanceHelpDialog.close();
});

compareNumericalButton?.addEventListener("click",()=>setComparisonView("numerical"));
compareVisualButton?.addEventListener("click",()=>setComparisonView("visual"));
compareGeometryButton?.addEventListener("click",()=>setComparisonVisualRole("geometry"));
comparePortraitButton?.addEventListener("click",()=>setComparisonVisualRole("portrait"));
compareRevealButton?.addEventListener("click",()=>setComparisonVisualMode("reveal"));
compareSideBySideButton?.addEventListener("click",()=>setComparisonVisualMode("side-by-side"));
compareClose?.addEventListener("click",()=>compareDialog?.close());
compareDialog?.addEventListener("click",(event)=>{
  if(event.target===compareDialog)compareDialog.close();
});
compareDialog?.addEventListener("close",()=>{
  comparisonState=null;
  comparisonView="numerical";
  comparisonVisualRole="geometry";
  comparisonVisualMode="reveal";
  comparisonEyeAlignments.clear();
  comparisonEyeAlignmentEditor=null;
  compareActions?.replaceChildren();
  compareChanges?.replaceChildren();
  compareParameterMatrix?.replaceChildren();
  compareHealthMatrix?.replaceChildren();
  compareVisualBody?.replaceChildren();
  if(compareBaselineReport)compareBaselineReport.onclick=null;
  if(compareShadowReport)compareShadowReport.onclick=null;
  if(compareNumericalBody)compareNumericalBody.hidden=false;
  if(compareVisualBody)compareVisualBody.hidden=true;
  if(compareVisualRole)compareVisualRole.hidden=true;
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
