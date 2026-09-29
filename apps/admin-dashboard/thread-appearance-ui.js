import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton, setWaitingContent } from "./fa-icons.js";

const PHYSICAL_MIGRATION_ID="physical_embodiment_v2";
const REFRESH_POLL_MS=20_000;
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
  const migrationSource=visual?.migration?.id===PHYSICAL_MIGRATION_ID?visual:physical;
  const migration=migrationSource?.migration?.id===PHYSICAL_MIGRATION_ID?migrationSource.migration:null;
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

async function requestHealth(threadId){
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

async function postRepair(threadId,body){
  const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/repair",{
    method:"POST",
    headers:{"content-type":"application/json",Accept:"application/json"},
    body:JSON.stringify(body),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error?.detail??payload?.error?.code??payload?.error??("HTTP "+response.status));
  return payload;
}

function delay(ms){
  return new Promise(resolve=>window.setTimeout(resolve,ms));
}

function announceThreadUpdated(threadId){
  window.dispatchEvent(new CustomEvent("fibre:thread-updated",{
    detail:{threadId,change:"appearance_ready"},
  }));
}

function actionButton(label,onClick,{primary=false,tooltip=label,appearanceProgress=false}={}){
  const button=el("button",(primary?"primary":"secondary")+" thread-repair-button");
  button.type="button";
  decorateActionButton(button,{icon:primary?"arrow-up-from-bracket":"rotate",label,tooltip});
  if(appearanceProgress){
    button.dataset.appearanceProgress="";
    button.dataset.appearanceLabel=label;
    button.dataset.appearanceTooltip=tooltip;
  }
  button.addEventListener("click",onClick);
  return button;
}

function setAppearanceBusy(host,busy){
  if(busy)host.setAttribute("aria-busy","true");
  else host.removeAttribute("aria-busy");
  for(const button of host.querySelectorAll("[data-appearance-progress]")){
    button.disabled=busy;
    button.setAttribute("aria-busy",String(busy));
    decorateActionButton(button,{
      icon:"rotate",
      label:button.dataset.appearanceLabel,
      tooltip:button.dataset.appearanceTooltip,
      spinning:busy,
    });
  }
}

function fact(label,value,{mono=false}={}){
  const item=el("div","thread-appearance-fact");
  item.append(
    el("span",null,label),
    el("strong",mono?"mono":null,value??"—"),
  );
  return item;
}

function renderEvidence(host,evidence){
  if(evidence===null)return;
  const maternal=sideEvidence(evidence,"maternal");
  const paternal=sideEvidence(evidence,"paternal");
  if(maternal===null&&paternal===null)return;
  const box=el("div","thread-appearance-evidence");
  box.append(el("strong",null,"Recorded parental physical origin"));
  if(maternal)box.append(el("p",null,"Maternal · "+maternal));
  if(paternal)box.append(el("p",null,"Paternal · "+paternal));
  box.append(el("small",null,"Durable operator evidence is reused as recorded; Fibre does not infer ancestry from name, place, language, culture, or portrait."));
  host.append(box);
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

async function refreshUntilAppearanceReady(host,threadId,threadName){
  if(host.dataset.appearanceWatching==="true")return;
  host.dataset.appearanceWatching="true";
  setAppearanceBusy(host,true);

  const progress=el("div","thread-appearance-progress");
  progress.append(el("span","thread-appearance-spinner"),el("span",null,"Checking appearance…"));
  host.append(progress);

  try{
    while(host.isConnected&&host.dataset.appearanceWatching==="true"){
      const health=await requestHealth(threadId);
      const state=threadAppearanceState(health.diagnosis);

      if(state.appearanceReady){
        const identity=await requestIdentity(threadId);
        if(presentationIdentityMediaReady(identity,state.objectRef)){
          delete host.dataset.appearanceWatching;
          setAppearanceBusy(host,false);
          progress.lastElementChild.textContent="Appearance ready · refreshing Thread…";
          announceThreadUpdated(threadId);
          return;
        }
        progress.lastElementChild.textContent="Canonical appearance ready · waiting for identity photo…";
        await delay(REFRESH_POLL_MS);
        continue;
      }

      if(state.appearanceBlocked||health.reconciliation?.state==="dead_letter"){
        delete host.dataset.appearanceWatching;
        setAppearanceBusy(host,false);
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
        delete host.dataset.appearanceWatching;
        setAppearanceBusy(host,false);
        await render(host,threadId,threadName,"Appearance status refreshed.",health);
        return;
      }

      progress.lastElementChild.textContent="Appearance generation is still running · checking again in 20 seconds…";
      await delay(REFRESH_POLL_MS);
    }
  }catch(error){
    delete host.dataset.appearanceWatching;
    setAppearanceBusy(host,false);
    progress.remove();
    host.append(el("div","error-box","Appearance refresh failed: "+(error instanceof Error?error.message:String(error))));
  }
}

async function render(host,threadId,threadName,message=null,providedHealth=null){
  const health=providedHealth??await requestHealth(threadId);
  const state=threadAppearanceState(health.diagnosis);
  host.replaceChildren();

  const head=el("div","thread-person-section-head");
  head.append(
    el("h3",null,"Appearance"),
    el("span",null,
      state.canMigrate
        ? (state.currentVersion===null?"migration available":"model upgrade available")
        : state.embodiment?.code==="CANONICAL_EMBODIMENT_PENDING"
          ? "generation pending"
          : state.canRerender?"current":"needs attention"
    ),
  );
  host.append(head);

  const facts=el("div","thread-appearance-facts");
  facts.append(
    fact("Physical model",state.currentVersion??"None",{mono:true}),
    fact("Target model",state.targetVersion??"—",{mono:true}),
    fact("Render model",state.currentAppearanceVersion??(state.visual?.code==="CANONICAL_VISUAL_MODEL_OUTDATED"?"Legacy":"—"),{mono:true}),
    fact("Visual authority",state.visual?.authority??(["CANONICAL_VISUAL_SPEC","CANONICAL_VISUAL_MODEL_OUTDATED"].includes(state.visual?.code)?"Embodiment":"—")),
    fact("Canonical root",state.objectRef??"Not available",{mono:true}),
  );
  host.append(facts);
  renderEvidence(host,state.evidence);
  if(message)host.append(el("p","thread-repair-message",message));

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
          const payload=await postRepair(threadId,{
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
              ? label+" admitted. Canonical root generation is pending; use Refresh appearance to inspect convergence."
              : label+" complete.",
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
          const payload=await postRepair(threadId,{
            action:"canonical_visual_identity_renewal",
            operationKey:"admin_appearance_rerender_"+Date.now().toString(36),
            reason:input.reason,
            evidenceReferences:[],
          });
          const pending=payload?.visualIdentityRenewal?.embodiment?.status==="pending_generation";
          if(pending){
            void refreshUntilAppearanceReady(host,threadId,threadName);
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
    host.append(el("p","thread-repair-note","Appearance authority is not ready for migration or re-rendering. Resolve the Thread health findings first."));
  }

  actions.append(actionButton("Refresh appearance",()=>refreshUntilAppearanceReady(host,threadId,threadName),{
    tooltip:"Refresh appearance and, while generation is pending, check every 20 seconds until the canonical portrait is published.",
    appearanceProgress:true,
  }));
  host.append(actions);
}

export function threadAppearanceSection(threadId,threadName=null){
  const host=el("section","thread-person-section thread-appearance-section");
  const waiting=el("div","thread-loading");
  setWaitingContent(waiting,"Loading appearance authority");
  host.append(waiting);
  void render(host,threadId,threadName).catch(error=>{
    host.replaceChildren(el("div","error-box","Appearance unavailable: "+(error instanceof Error?error.message:String(error))));
  });
  return host;
}
