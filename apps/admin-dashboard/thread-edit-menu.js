import {actionFields,openThreadActionDialog} from "./thread-action-dialog.js";
import {decorateActionButton,faIcon} from "./fa-icons.js";
import {createThreadPortrait} from "./thread-person-ui.js";
import {identityActionPayload} from "./thread-identity-action.js";
import {reissueFidCard,resumeFidReissue} from "./thread-observatory.js";

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
  // Recovered but malformed geography may offer only a country-code repair.
  // Keep the verified-city replacement available through the same World command.
  if(findings.some(f=>String(f?.code??"").startsWith("BIRTH_"))
    &&!actions.some(a=>a.kind==="identity"&&a.fields.some(f=>f.name==="birthPlace"))){
    actions.push({
      kind:"identity",id:"change_birth_place",label:"Change birth place",
      description:"Choose a verified birth city.",
      fields:[{name:"birthPlace",label:"Verified birth city",kind:"place_search",required:true,
        ...(diagnosis?.identity?.birthPlace?{default:diagnosis.identity.birthPlace}:{})}],
      action:{id:"change_birth_place",command:"identity"},required:true,
    });
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
  actions.push({kind:"photo",id:"official-photo",label:"Correct Official ID Photo",
    description:"Review a proposed photograph against the canonical identity before changing the card."});
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

const element=(tag,className="",text=null)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==null)node.textContent=text;
  return node;
};

function actionLook(spec){
  if(spec.kind==="fid")return {group:"Documents",icon:"id-card",
    detail:"Issue a new card; keep the existing FIN."};
  if(spec.kind==="photo")return {group:"Documents",icon:"image",
    detail:"Review and correct the official photograph."};
  if(spec.kind==="migration")return {group:"Maintenance",icon:"wrench",
    detail:spec.description};
  if(spec.kind==="repair")return {group:"Maintenance",icon:"wrench",
    detail:spec.description};
  if(spec.id.includes("birth_place")||spec.id.includes("birth_geography")
    ||spec.id==="set_birth_country_code")return {group:"Identity",icon:"location-dot",
      detail:spec.id==="repair_birth_geography"||spec.id==="set_birth_country_code"
        ?"Verify the stored birthplace's country code.":"Choose an authoritative, verified birth city."};
  if(spec.id.includes("birth_date"))return {group:"Identity",icon:"cake-candles",
    detail:"Correct the recorded date of birth."};
  if(spec.id.includes("name"))return {group:"Identity",icon:"edit",
    detail:"Correct the Thread's recorded name."};
  if(spec.id.includes("language")||spec.action?.command==="raised_languages"){
    return {group:"Identity",icon:"language",detail:"Correct the languages of upbringing."};
  }
  if(spec.id.includes("sex"))return {group:"Identity",icon:"venus-mars",
    detail:"Correct the recorded sex."};
  return {group:"Identity",icon:"edit",detail:spec.description};
}

function menu(){
  let dialog=document.querySelector("#thread-edit-menu");
  if(dialog)return dialog;
  dialog=element("dialog","thread-edit-menu");
  dialog.id="thread-edit-menu";
  const head=element("header","thread-edit-head");
  const avatar=element("div","thread-edit-avatar");
  const identity=element("div","thread-edit-identity");
  const title=element("h2","thread-edit-title","Edit Thread");
  const meta=element("p","thread-edit-meta");
  const badge=element("span","thread-edit-attention");
  badge.hidden=true;
  identity.append(title,meta,badge);
  const dismiss=element("button","thread-edit-dismiss","×");
  dismiss.type="button";dismiss.setAttribute("aria-label","Close Thread editor");
  dismiss.addEventListener("click",()=>dialog.close());
  head.append(avatar,identity,dismiss);

  const list=element("div","thread-edit-list");
  const footer=element("footer","thread-edit-footer");
  const close=element("button","secondary","Close");
  close.type="button";close.addEventListener("click",()=>dialog.close());
  footer.append(close);
  dialog.append(head,list,footer);
  document.body.append(dialog);
  return dialog;
}

function renderThreadHeader(dialog,threadId,name,diagnosis=null){
  const facts=diagnosis?.identity??{};
  const label=facts.name??name??"Thread";
  dialog.querySelector(".thread-edit-title").textContent=label;
  const avatar=dialog.querySelector(".thread-edit-avatar");
  avatar.replaceChildren(createThreadPortrait({threadId,name:label,link:false}));
  const details=[
    facts.fibreIdentityNumber?String(facts.fibreIdentityNumber):null,
    facts.birthDate?String(facts.birthDate):null,
    facts.birthPlace?String(facts.birthPlace):null,
  ].filter(Boolean);
  dialog.querySelector(".thread-edit-meta").textContent=
    details.length?details.join(" · "):"Authoritative World identity";
  const needsBirth=(diagnosis?.findings??[]).some(f=>
    ["BIRTH_PLACE_MISSING","BIRTH_GEOGRAPHY_RECOVERABLE",
      "BIRTH_COUNTRY_CODE_MISSING"].includes(f.code));
  const attention=dialog.querySelector(".thread-edit-attention");
  attention.hidden=!needsBirth&&(!diagnosis||diagnosis.health==="healthy");
  attention.textContent=needsBirth?"Birth place needs correction":"Needs attention";
}

function renderThreadChoices(list,actions,onChoose){
  list.replaceChildren();
  for(const group of ["Identity","Documents","Maintenance"]){
    const entries=actions.filter(spec=>actionLook(spec).group===group);
    if(!entries.length)continue;
    const section=element("section","thread-edit-group");
    section.append(element("h3",null,group));
    const grid=element("div","thread-edit-grid");
    for(const spec of entries){
      const {icon,detail}=actionLook(spec);
      const choice=element("button","thread-edit-choice");
      choice.type="button";
      const symbol=element("span","thread-edit-symbol");
      symbol.append(faIcon(icon));
      const copy=element("span","thread-edit-choice-copy");
      copy.append(element("strong",null,spec.label));
      copy.append(element("small",null,
        spec.required&&spec.description?spec.description:detail));
      const arrow=element("span","thread-edit-chevron","›");
      arrow.setAttribute("aria-hidden","true");
      choice.append(symbol,copy,arrow);
      choice.addEventListener("click",()=>onChoose(spec));
      grid.append(choice);
    }
    section.append(grid);list.append(section);
  }
}

export function createThreadEditButton({threadId,name=null,iconOnly=false,onComplete=null}={}){
  const button=document.createElement("button");
  button.type="button";button.className="secondary thread-edit-trigger";
  decorateActionButton(button,{icon:"edit",label:"Edit Thread",
    tooltip:"Edit identity and manage Thread actions",iconOnly});
  button.addEventListener("click",async event=>{
    event.stopPropagation();
    const dialog=menu(),list=dialog.querySelector(".thread-edit-list");
    dialog.dataset.threadId=threadId;
    renderThreadHeader(dialog,threadId,name);
    list.textContent="Loading available actions…";
    dialog.showModal();
    try{
      const data=await repairRequest(threadId);
      if(!dialog.open||dialog.dataset.threadId!==threadId)return;
      renderThreadHeader(dialog,threadId,name,data.diagnosis);
      renderThreadChoices(list,threadEditActions(data.diagnosis,data.reconciliation),(spec)=>{
          dialog.close();
          if(spec.kind==="photo"){
            const onThreadPage=location.pathname==="/thread/"+encodeURIComponent(threadId);
            const correction=onThreadPage
              ?document.querySelector(".thread-observatory-page #correct-official-id-photo")
              :null;
            if(correction){
              document.querySelector('.thread-detail-tab[data-tab="identity"]')?.click();
              correction.scrollIntoView({block:"center"});
              correction.click(); // Reuse the existing photographic review workflow.
            }else{
              location.href="/thread/"+encodeURIComponent(threadId)+"#correct-official-id-photo";
            }
            return;
          }
          openThreadActionDialog({
            threadId,threadName:name,label:spec.label,
            eyebrow:spec.kind==="fid"?"Fibre Identity Card"
              :spec.kind==="identity"?"Authoritative identity":"Thread maintenance",
            description:spec.description,fields:spec.fields??[],
            run:async input=>{
              const notify=result=>{
                window.dispatchEvent(new CustomEvent(
                  spec.kind==="fid"?"fibre:fid-card-reissued"
                    :spec.kind==="identity"?"fibre:thread-identity-updated":"fibre:thread-updated",
                  {detail:{threadId,actionId:spec.id,result}},
                ));
                onComplete?.(spec,result);
              };
              if(spec.kind!=="fid"){
                notify(await repairRequest(threadId,actionBody(spec,input)));
                return;
              }
              const idempotencyKey=operation("admin_fid_reissue")
                +"_"+Math.random().toString(36).slice(2,8);
              const result=await reissueFidCard(threadId,{idempotencyKey});
              if(result?.state!=="derivation_requested"){
                notify(result);
                return;
              }
              // The request is accepted, not completed. Continue the same
              // issuance without authoring duplicate cards or blocking Admin.
              onComplete?.(spec,result);
              void resumeFidReissue(threadId,{idempotencyKey,initialResult:result})
                .then(completed=>{
                  if(completed?.state==="active")notify(completed);
                  else console.warn("FIN Card reissue remains incomplete",completed?.state);
                }).catch(error=>console.warn("FIN Card reissue follow-up failed",error));
            },
          });
      });
    }catch(error){
      if(dialog.open&&dialog.dataset.threadId===threadId){
        list.textContent="Unable to load Thread actions: "+String(error.message??error);
      }
    }
  });
  return button;
}
