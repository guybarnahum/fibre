import {actionFields,openThreadActionDialog} from "./thread-action-dialog.js";
import {decorateActionButton} from "./fa-icons.js";
import {identityActionPayload} from "./thread-identity-action.js";
import {reissueFidCard} from "./thread-observatory.js";

const human=value=>String(value??"").replaceAll("_"," ");
const operation=prefix=>prefix+"_"+Date.now().toString(36);

export function threadEditActions(diagnosis,reconciliation){
  if(diagnosis?.exists===false)return [];
  const findings=diagnosis?.findings??[];
  const actions=[],seen=new Set();
  for(const finding of findings){
    const action=finding?.identityAction;
    if(action?.id&&!seen.has(action.id)){
      seen.add(action.id);
      actions.push({kind:"identity",id:action.id,
        label:action.label??human(action.id),
        description:finding.reason??"Update authoritative World identity.",
        fields:actionFields(action),action,
        required:finding.state==="operator_decision_required"});
    }
    const migration=finding?.migration;
    if(migration?.id&&!seen.has("migration:"+migration.id)){
      seen.add("migration:"+migration.id);
      actions.push({kind:"migration",id:migration.id,
        label:"Migrate · "+(migration.label??human(migration.id)),
        description:"Apply preserved evidence to authoritative World identity.",
        fields:actionFields(migration),migration});
    }
  }
  const dead=reconciliation?.state==="dead_letter";
  const pending=reconciliation?.state==="pending";
  if(diagnosis?.health==="repairable"&&findings.some(f=>f.state==="repairable"&&f.action)){
    actions.push({kind:"repair",id:"repair",
      label:dead?"Repair & recover":"Repair",
      description:"Repair derived state from authoritative World facts."});
  }else if(pending&&diagnosis?.health==="healthy"){
    actions.push({kind:"repair",id:"reconcile",label:"Resolve reconciliation",
      description:"Resolve stale pending reconciliation after checking World health."});
  }else if(dead&&diagnosis?.health==="healthy"){
    actions.push({kind:"repair",id:"recover",label:"Recover",
      description:"Return a healthy Thread from reconciliation quarantine."});
  }
  actions.push({kind:"fid",id:"fid",label:"Re-issue FIN Card",
    description:"Cut a new identity card without changing the Thread's FIN."});
  return actions;
}

async function repairRequest(threadId,body=null){
  const response=await fetch("/api/threads/"+encodeURIComponent(threadId)+"/repair",{
    method:body===null?"GET":"POST",
    headers:{Accept:"application/json",...(body===null?{}:{"content-type":"application/json"})},
    ...(body===null?{}:{body:JSON.stringify(body)}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw Error(result?.error?.detail??result?.error?.code
    ??result?.error??`HTTP ${response.status}`);
  return result;
}

function actionBody(spec,input){
  if(spec.kind==="identity"){
    const action=spec.action;
    return identityActionPayload(action,input,{
      operationKey:operation(action.command==="raised_languages"?"admin_raised_languages":"admin_identity"),
    });
  }
  if(spec.kind==="migration")return {
    action:"migrate",migrationId:spec.migration.id,
    migrationKey:operation("admin_migration"),input,
  };
  if(spec.id==="recover")return {action:"recover"};
  return {repairKey:operation(spec.id==="reconcile"?"admin_reconcile":"admin_repair")};
}

function menu(){
  let dialog=document.querySelector("#thread-edit-menu");
  if(dialog)return dialog;
  dialog=document.createElement("dialog");
  dialog.id="thread-edit-menu";dialog.className="thread-edit-menu";
  const title=document.createElement("h2");
  const list=document.createElement("div");list.className="thread-edit-list";
  const close=document.createElement("button");close.type="button";
  close.className="secondary";close.textContent="Close";
  close.addEventListener("click",()=>dialog.close());
  dialog.append(title,list,close);
  document.body.append(dialog);
  return dialog;
}

export function createThreadEditButton({threadId,name=null,iconOnly=false,onComplete=null}={}){
  const button=document.createElement("button");
  button.type="button";button.className="secondary thread-edit-trigger";
  decorateActionButton(button,{icon:"edit",label:"Edit Thread",
    tooltip:"Edit identity and manage Thread actions",iconOnly});
  button.addEventListener("click",async event=>{
    event.stopPropagation();
    const dialog=menu(),list=dialog.querySelector(".thread-edit-list");
    dialog.querySelector("h2").textContent="Edit "+(name??"Thread");
    list.textContent="Loading available actions…";
    dialog.showModal();
    try{
      const data=await repairRequest(threadId);
      if(!dialog.open)return;
      list.replaceChildren();
      for(const spec of threadEditActions(data.diagnosis,data.reconciliation)){
        const choice=document.createElement("button");
        choice.type="button";choice.className="thread-edit-choice";
        const label=document.createElement("strong");
        label.textContent=spec.label+(spec.required?" · action required":"");
        const hint=document.createElement("small");hint.textContent=spec.description;
        choice.append(label,hint);
        choice.addEventListener("click",()=>{
          dialog.close();
          openThreadActionDialog({
            threadId,threadName:name,label:spec.label,
            eyebrow:spec.kind==="fid"?"Fibre Identity Card"
              :spec.kind==="identity"?"Authoritative identity":"Thread maintenance",
            description:spec.description,fields:spec.fields??[],
            run:async input=>{
              const result=spec.kind==="fid"
                ?await reissueFidCard(threadId)
                :await repairRequest(threadId,actionBody(spec,input));
              window.dispatchEvent(new CustomEvent(
                spec.kind==="fid"?"fibre:fid-card-reissued"
                  :spec.kind==="identity"?"fibre:thread-identity-updated":"fibre:thread-updated",
                {detail:{threadId,actionId:spec.id,result}},
              ));
              onComplete?.(spec);
            },
          });
        });
        list.append(choice);
      }
    }catch(error){
      if(dialog.open)list.textContent="Unable to load Thread actions: "+String(error.message??error);
    }
  });
  return button;
}
