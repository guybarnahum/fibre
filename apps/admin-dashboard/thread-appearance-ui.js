import { actionFields, openThreadActionDialog } from "./thread-action-dialog.js";
import { decorateActionButton } from "./fa-icons.js";

const PHYSICAL_MIGRATION_ID="physical_embodiment_v2";
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
    "CANONICAL_VISUAL_SPEC",
    "CANONICAL_VISUAL_SPEC_MISSING",
    "GENESIS_VISUAL_SEED",
  ]);
  const embodiment=finding(diagnosis,[
    "CANONICAL_EMBODIMENT",
    "CANONICAL_EMBODIMENT_PENDING",
    "CANONICAL_EMBODIMENT_MISSING",
  ]);
  const migration=physical?.migration?.id===PHYSICAL_MIGRATION_ID?physical.migration:null;
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
    migration,
    evidence,
    currentVersion,
    targetVersion,
    objectRef:embodiment?.objectRef??null,
    canMigrate:migration!==null,
    canRerender:current&&visualHealthy&&embodimentHealthy,
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

function actionButton(label,onClick,{primary=false,tooltip=label}={}){
  const button=el("button",(primary?"primary":"secondary")+" thread-repair-button");
  button.type="button";
  decorateActionButton(button,{icon:primary?"arrow-up-from-bracket":"rotate",label,tooltip});
  button.addEventListener("click",onClick);
  return button;
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
  if(state.evidence!==null){
    return "Upgrade inherited physical authority using the recorded parental physical-origin evidence above. The renderer receives the resulting anatomy, not ancestry labels.";
  }
  return "Record explicit maternal and paternal physical origin, then migrate this Thread onto the current physical appearance model. Do not infer ancestry from identity, birthplace, language, culture, or the existing portrait.";
}

async function render(host,threadId,threadName,message=null){
  const health=await requestHealth(threadId);
  const state=threadAppearanceState(health.diagnosis);
  host.replaceChildren();

  const head=el("div","thread-person-section-head");
  head.append(
    el("h3",null,"Appearance"),
    el("span",null,state.canMigrate?"model upgrade available":state.canRerender?"current":"needs attention"),
  );
  host.append(head);

  const facts=el("div","thread-appearance-facts");
  facts.append(
    fact("Physical model",state.currentVersion??"None",{mono:true}),
    fact("Target model",state.targetVersion??"—",{mono:true}),
    fact("Visual authority",state.visual?.authority??(state.visual?.code==="CANONICAL_VISUAL_SPEC"?"Embodiment":"—")),
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
      tooltip:label+" — install current inherited physical authority and generate a new canonical root.",
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
        fields:[{name:"reason",label:"Reason",kind:"text",required:true}],
        run:async input=>{
          const payload=await postRepair(threadId,{
            action:"canonical_visual_identity_renewal",
            operationKey:"admin_appearance_rerender_"+Date.now().toString(36),
            reason:input.reason,
            evidenceReferences:[],
          });
          const pending=payload?.visualIdentityRenewal?.embodiment?.status==="pending_generation";
          await render(
            host,
            threadId,
            threadName,
            pending
              ? "Re-render admitted. Physical genome and specification are unchanged; root generation is pending."
              : "Re-render complete. Physical genome and canonical specification were unchanged.",
          );
        },
      });
    },{
      tooltip:"Re-render appearance — replace only the generated canonical root; keep physical genome and specification unchanged.",
    }));
  }else{
    host.append(el("p","thread-repair-note","Appearance authority is not ready for migration or re-rendering. Resolve the Thread health findings first."));
  }

  actions.append(actionButton("Refresh appearance",()=>render(host,threadId,threadName),{
    tooltip:"Refresh appearance authority from World.",
  }));
  host.append(actions);
}

export function threadAppearanceSection(threadId,threadName=null){
  const host=el("section","thread-person-section thread-appearance-section");
  host.append(el("div","thread-loading","Loading appearance authority…"));
  void render(host,threadId,threadName).catch(error=>{
    host.replaceChildren(el("div","error-box","Appearance unavailable: "+(error instanceof Error?error.message:String(error))));
  });
  return host;
}
