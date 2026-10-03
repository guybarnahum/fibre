import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton, setBlockingButtonState, setWaitingContent } from "./fa-icons.js";
import { watchAdminLive } from "./admin-live.js";
import { invalidateView, threadViewKey } from "./view-invalidation.js";

function el(tag,className=null,text=null){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
}

function finding(diagnosis,codes){
  return (diagnosis?.findings??[]).find(entry=>codes.includes(entry?.code))??null;
}

export function threadAppearanceState(diagnosis){
  const physical=finding(diagnosis,[
    "PHYSICAL_GENOME",
    "PHYSICAL_APPEARANCE_MODEL_OUTDATED",
    "PHYSICAL_APPEARANCE_CALIBRATION_OUTDATED",
    "LEGACY_PHYSICAL_EMBODIMENT",
  ]);
  const visual=finding(diagnosis,[
    "CANONICAL_VISUAL_MODEL_OUTDATED",
    "CANONICAL_VISUAL_SPEC",
    "CANONICAL_VISUAL_SPEC_MISSING",
    "GENESIS_VISUAL_SEED",
  ]);
  const embodiment=finding(diagnosis,[
    "CANONICAL_EMBODIMENT",
    "CANONICAL_EMBODIMENT_PENDING",
    "CANONICAL_EMBODIMENT_MISSING",
  ]);
  const publication=finding(diagnosis,[
    "CANONICAL_VISUAL_PUBLICATION",
    "CANONICAL_VISUAL_NOT_PUBLISHED",
  ]);
  const migrationSource=(diagnosis?.findings??[]).find(
    (entry)=>entry?.migration?.domain==="appearance",
  )??null;
  const migration=migrationSource?.migration??null;
  const evidence=migration?.evidence??physical?.evidence??null;
  const currentVersion=physical?.code==="PHYSICAL_GENOME"
    ? physical.version??null
    : physical?.currentVersion??null;
  const targetVersion=physical?.targetVersion??(physical?.code==="PHYSICAL_GENOME"?physical.version??null:null);
  const current=physical?.code==="PHYSICAL_GENOME"&&physical?.state==="healthy";
  const visualHealthy=visual?.code==="CANONICAL_VISUAL_SPEC"&&visual?.state==="healthy";
  const embodimentHealthy=embodiment?.code==="CANONICAL_EMBODIMENT"&&embodiment?.state==="healthy";
  return Object.freeze({
    physical,
    visual,
    embodiment,
    publication,
    migration,
    evidence,
    currentVersion,
    targetVersion,
    currentAppearanceVersion:visual?.appearanceVersion??visual?.currentAppearanceVersion??null,
    targetAppearanceVersion:visual?.targetAppearanceVersion??visual?.appearanceVersion??null,
    objectRef:embodiment?.objectRef??null,
    canMigrate:migration!==null,
    canRerender:current&&visualHealthy&&embodimentHealthy,
    appearanceReady:current
      &&visualHealthy
      &&embodimentHealthy
      &&publication?.code==="CANONICAL_VISUAL_PUBLICATION"
      &&publication?.state==="healthy",
    appearanceBlocked:embodiment?.code==="CANONICAL_EMBODIMENT_PENDING"
      &&embodiment?.embodimentStatus==="unavailable_with_reason",
    appearancePending:(embodiment?.code==="CANONICAL_EMBODIMENT_PENDING"
      &&embodiment?.embodimentStatus!=="unavailable_with_reason")
      ||publication?.code==="CANONICAL_VISUAL_NOT_PUBLISHED",
  });
}

function sideEvidence(evidence,side){
  const entries=evidence?.physicalAncestry?.[side];
  if(!Array.isArray(entries)||entries.length===0)return null;
  return entries.map(entry=>{
    const population=entry?.population??"Recorded family";
    const reference=entry?.referencePopulation??null;
    return reference?population+" · "+reference:String(population);
  }).join(" + ");
}

export async function requestThreadAppearanceHealth(threadId){
  const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/repair",{
    headers:{Accept:"application/json"},
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok&&!(response.status===404&&payload?.diagnosis)){
    throw new Error(payload?.error?.detail??payload?.error?.code??payload?.error??("HTTP "+response.status));
  }
  return Object.freeze({diagnosis:payload.diagnosis,reconciliation:payload.reconciliation??null});
}

async function requestIdentity(threadId){
  const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/identity",{
    headers:{Accept:"application/json"},
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.detail??payload?.error??("HTTP "+response.status));
  return payload?.identity??null;
}

export function presentationIdentityMediaReady(identity,canonicalObjectRef){
  if(typeof canonicalObjectRef!=="string"||canonicalObjectRef==="")return false;
  const snapshot=identity?.presentation??null;
  if(snapshot?.presentation?.visualIdentity?.referenceObjectRefs?.[0]!==canonicalObjectRef)return false;
  const photos=(snapshot?.media?.assets??[]).filter(asset=>(
    asset?.role==="official_id_photo"
    &&asset?.status==="ready"
    &&Array.isArray(asset?.sourceReferences)
    &&asset.sourceReferences.includes(canonicalObjectRef)
  ));
  return photos.length===1;
}

export async function postThreadAppearanceRepair(threadId,body){
  const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/repair",{
    method:"POST",
    headers:{"content-type":"application/json",Accept:"application/json"},
    body:JSON.stringify(body),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error?.detail??payload?.error?.code??payload?.error??("HTTP "+response.status));
  return payload;
}


function actionButton(label,onClick,{primary=false,tooltip=label,appearanceProgress=false}={}){
  const button=el("button",(primary?"primary":"secondary")+" thread-repair-button");
  button.type="button";
  decorateActionButton(button,{icon:primary?"arrow-up-from-bracket":"rotate",label,tooltip});
  if(appearanceProgress){
    button.dataset.appearanceProgress="";
    button.dataset.appearanceLabel=label;
    button.dataset.appearanceTooltip=tooltip;
    button.dataset.appearanceIcon=primary?"arrow-up-from-bracket":"rotate";
  }
  button.addEventListener("click",onClick);
  return button;
}

function setAppearanceBusy(host,busy){
  if(busy)host.setAttribute("aria-busy","true");
  else host.removeAttribute("aria-busy");
  for(const button of host.querySelectorAll("[data-appearance-progress]")){
    setBlockingButtonState(button,busy,{
      label:button.dataset.appearanceLabel,
      tooltip:button.dataset.appearanceTooltip,
      icon:button.dataset.appearanceIcon||null,
      busyLabel:button.dataset.appearanceLabel,
      busyTooltip:button.dataset.appearanceTooltip,
    });
  }
}

function appearanceField(label,value,{mono=false,wide=false}={}){
  const item=el("div","thread-appearance-field"+(wide?" is-wide":""));
  item.append(
    el("span","thread-appearance-field-label",label),
    el("strong",mono?"mono":null,value??"—"),
  );
  return item;
}

function appearanceGroup(title,fields,{wide=false}={}){
  const group=el("section","thread-appearance-group"+(wide?" is-wide":""));
  group.append(el("h4",null,title));
  const body=el("div","thread-appearance-group-fields");
  body.append(...fields);
  group.append(body);
  return group;
}

function appearanceStatus(state){
  if(state.appearanceReady)return Object.freeze({label:"Current",tone:"good"});
  if(state.appearanceBlocked)return Object.freeze({label:"Blocked",tone:"bad"});
  if(state.appearancePending)return Object.freeze({label:"Generating",tone:"warn"});
  if(state.canMigrate)return Object.freeze({label:"Migration available",tone:"warn"});
  if(state.canRerender)return Object.freeze({label:"Current",tone:"good"});
  return Object.freeze({label:"Needs attention",tone:"warn"});
}

function appearanceSummary(state){
  const summary=el("summary","thread-appearance-summary");
  const copy=el("div","thread-appearance-summary-copy");
  copy.append(
    el("strong",null,"Appearance"),
    el("span",null,"Physical lineage, model authority, and canonical visual identity"),
  );
  const status=appearanceStatus(state);
  summary.append(copy,el("span","thread-health-tag "+status.tone,status.label));
  return summary;
}

function appearanceLineageGroup(evidence){
  const maternal=sideEvidence(evidence,"maternal");
  const paternal=sideEvidence(evidence,"paternal");
  const fields=[
    appearanceField("Maternal",maternal??"Not recorded"),
    appearanceField("Paternal",paternal??"Not recorded"),
  ];
  const group=appearanceGroup("Physical lineage",fields);
  const note=el("p","thread-appearance-evidence-note",
    "Durable operator evidence is reused as recorded. Fibre does not infer ancestry from name, place, language, culture, or portrait."
  );
  group.append(note);
  return group;
}

function migrationDescription(state){
  if(state.visual?.code==="CANONICAL_VISUAL_MODEL_OUTDATED"){
    return "Upgrade only the canonical visual specification and generated root from the existing current physical genome. Physical inheritance stays unchanged.";
  }
  if(state.evidence!==null){
    return "Upgrade inherited physical authority using the recorded parental physical-origin evidence above. The renderer receives the resulting anatomy, not ancestry labels.";
  }
  if(state.migration?.suggestion?.source==="birthplace"){
    return "Suggested from birthplace ("+state.migration.suggestion.country+"). Review or override every parental field before migrating; birthplace is a statistical default, not ancestry evidence.";
  }
  return "Record explicit maternal and paternal physical origin, then migrate this Thread onto the current physical appearance model. Do not infer ancestry from identity, birthplace, language, culture, or the existing portrait.";
}

const appearanceWatches=new WeakMap();

function stopAppearanceWatch(host){
  const stop=appearanceWatches.get(host);
  if(stop)stop();
  appearanceWatches.delete(host);
  delete host.dataset.appearanceWatching;
  setAppearanceBusy(host,false);
}

function appearanceProgress(host){
  let progress=host.querySelector(".thread-appearance-progress");
  if(progress)return progress;
  progress=el("div","thread-appearance-progress");
  setWaitingContent(progress,"Waiting for appearance publication");
  (host.querySelector(".thread-appearance-body")??host).append(progress);
  return progress;
}

async function reconcileAppearance(host,threadId,threadName){
  if(!host.isConnected){
    stopAppearanceWatch(host);
    return;
  }
  const progress=appearanceProgress(host);
  setAppearanceBusy(host,true);
  try{
    const health=await requestThreadAppearanceHealth(threadId);
    const state=threadAppearanceState(health.diagnosis);

    if(state.appearanceReady){
      const identity=await requestIdentity(threadId);
      if(presentationIdentityMediaReady(identity,state.objectRef)){
        stopAppearanceWatch(host);
        await render(host,threadId,threadName,"Appearance ready.",health);
        invalidateView(threadViewKey(threadId,"presentation"),{
          source:"appearance",
          reason:"ready",
        });
        return;
      }
      progress.lastElementChild.textContent="Canonical appearance ready · waiting for identity photo publication…";
      return;
    }

    if(state.appearanceBlocked||health.reconciliation?.state==="dead_letter"){
      stopAppearanceWatch(host);
      await render(
        host,
        threadId,
        threadName,
        "Appearance generation stopped before publication. Check Thread health for the blocking reconciliation error.",
        health,
      );
      return;
    }

    if(!state.appearancePending){
      stopAppearanceWatch(host);
      await render(host,threadId,threadName,"Appearance status refreshed.",health);
      return;
    }

    progress.lastElementChild.textContent="Appearance generation is running · waiting for publication…";
  }catch(error){
    progress.lastElementChild.textContent="Appearance status unavailable · waiting for the next change…";
    console.warn("Appearance live reconciliation failed",error);
  }
}

function watchAppearance(host,threadId,threadName,{reconcileOnSubscribe=true}={}){
  if(appearanceWatches.has(host))return;
  host.dataset.appearanceWatching="true";
  setAppearanceBusy(host,true);
  appearanceProgress(host);
  const stop=watchAdminLive(
    threadViewKey(threadId,"presentation"),
    ()=>reconcileAppearance(host,threadId,threadName),
    {
      active:()=>host.isConnected&&host.dataset.appearanceWatching==="true",
      reconcileOnSubscribe,
    },
  );
  appearanceWatches.set(host,stop);
}

async function refreshAppearance(host,threadId,threadName){
  if(!appearanceWatches.has(host)){
    watchAppearance(host,threadId,threadName,{reconcileOnSubscribe:false});
  }
  await reconcileAppearance(host,threadId,threadName);
}

async function render(host,threadId,threadName,message=null,providedHealth=null){
  const health=providedHealth??await requestThreadAppearanceHealth(threadId);
  const state=threadAppearanceState(health.diagnosis);
  host.replaceChildren();

  host.append(appearanceSummary(state));

  const body=el("div","thread-appearance-body");
  const groups=el("div","thread-appearance-groups");
  groups.append(
    appearanceGroup("Physical authority",[
      appearanceField("Current model",state.currentVersion??"None",{mono:true}),
      appearanceField("Target model",state.targetVersion??"—",{mono:true}),
    ]),
    appearanceLineageGroup(state.evidence),
    appearanceGroup("Canonical visual identity",[
      appearanceField("Render model",state.currentAppearanceVersion??(state.visual?.code==="CANONICAL_VISUAL_MODEL_OUTDATED"?"Legacy":"—"),{mono:true}),
      appearanceField("Authority",state.visual?.authority??(["CANONICAL_VISUAL_SPEC","CANONICAL_VISUAL_MODEL_OUTDATED"].includes(state.visual?.code)?"Embodiment":"—")),
      appearanceField("Canonical root",state.objectRef??"Not available",{mono:true,wide:true}),
    ],{wide:true}),
  );
  body.append(groups);
  if(message)body.append(el("p","thread-repair-message",message));

  const actions=el("div","thread-repair-actions");
  if(state.canMigrate){
    const migration=state.migration;
    const label=migration.label??"Upgrade appearance model";
    actions.append(actionButton(label,()=>{
      openThreadActionDialog({
        threadId,
        threadName,
        label,
        eyebrow:"Appearance authority",
        description:migrationDescription(state),
        fields:actionFields(migration),
        run:async input=>{
          const payload=await postThreadAppearanceRepair(threadId,{
            action:"migrate",
            migrationId:migration.id,
            migrationKey:"admin_appearance_migration_"+Date.now().toString(36),
            input,
          });
          const pending=payload?.migration?.visualIdentityCorrection?.embodiment?.status==="pending_generation";
          await render(
            host,
            threadId,
            threadName,
            pending
              ? label+" admitted. Canonical root generation is pending."
              : label+" complete.",
            {
              diagnosis:payload.migration.after,
              reconciliation:payload.reconciliation??null,
            },
          );
        },
      });
    },{
      primary:true,
      tooltip:state.visual?.code==="CANONICAL_VISUAL_MODEL_OUTDATED"
        ? label+" — preserve the physical genome, upgrade the canonical render specification, and generate a new root."
        : label+" — install current inherited physical authority and generate a new canonical root.",
    }));
  }else if(state.canRerender){
    const label="Re-render appearance";
    actions.append(actionButton(label,()=>{
      openThreadActionDialog({
        threadId,
        threadName,
        label,
        eyebrow:"Appearance",
        description:"Generate a new canonical root from the unchanged current physical genome and canonical specification. Use this only when the authority is sound but one render is poor.",
        fields:[{
          name:"reason",
          label:"Reason",
          kind:"text",
          required:true,
          default:"Generate a fresh canonical portrait from the unchanged current physical genome and canonical specification.",
        }],
        onBusyChange:busy=>{
          if(busy||host.dataset.appearanceWatching!=="true")setAppearanceBusy(host,busy);
        },
        run:async input=>{
          const payload=await postThreadAppearanceRepair(threadId,{
            action:"canonical_visual_identity_renewal",
            operationKey:"admin_appearance_rerender_"+Date.now().toString(36),
            reason:input.reason,
            evidenceReferences:[],
          });
          const pending=payload?.visualIdentityRenewal?.embodiment?.status==="pending_generation";
          if(pending){
            watchAppearance(host,threadId,threadName);
          }else{
            await render(
              host,
              threadId,
              threadName,
              "Re-render complete. Physical genome and canonical specification were unchanged.",
            );
          }
        },
      });
    },{
      tooltip:"Re-render appearance — replace only the generated canonical root; keep physical genome and specification unchanged.",
      appearanceProgress:true,
    }));
  }else{
    body.append(el("p","thread-repair-note","Appearance authority is not ready for migration or re-rendering. Resolve the Thread health findings first."));
  }

  actions.append(actionButton("Refresh appearance",()=>refreshAppearance(host,threadId,threadName),{
    tooltip:"Refresh appearance once. If publication is pending, wait for the live completion signal without polling.",
    appearanceProgress:true,
  }));
  body.append(actions);
  host.append(body);

  if(state.appearancePending){
    watchAppearance(host,threadId,threadName);
  }else{
    stopAppearanceWatch(host);
  }
}

export function threadAppearanceSection(threadId,threadName=null){
  const host=el("details","thread-person-section thread-appearance-section");
  const summary=el("summary","thread-appearance-summary");
  const copy=el("div","thread-appearance-summary-copy");
  copy.append(
    el("strong",null,"Appearance"),
    el("span",null,"Physical lineage, model authority, and canonical visual identity"),
  );
  summary.append(copy,el("span","thread-health-tag muted","Loading"));
  const waiting=el("div","thread-loading");
  setWaitingContent(waiting,"Loading appearance authority");
  host.append(summary,waiting);
  void render(host,threadId,threadName).catch(error=>{
    const failedSummary=el("summary","thread-appearance-summary");
    const failedCopy=el("div","thread-appearance-summary-copy");
    failedCopy.append(el("strong",null,"Appearance"),el("span",null,"Appearance authority unavailable"));
    failedSummary.append(failedCopy,el("span","thread-health-tag bad","Unavailable"));
    host.replaceChildren(failedSummary,el("div","error-box","Appearance unavailable: "+(error instanceof Error?error.message:String(error))));
  });
  return host;
}
