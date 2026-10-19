import {openThreadActionDialog} from "./thread-action-dialog.js";

const make=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
};
const base=threadId=>`/api/threads/${encodeURIComponent(threadId)}/age-anchors`;
async function api(url,{method="GET",body}={}){
  const response=await fetch(url,{
    method,headers:{Accept:"application/json",...(body?{"Content-Type":"application/json"}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.detail??result?.error??`HTTP ${response.status}`);
  return result;
}
function portrait(url,title){
  const card=make("article","thread-fid-photo");
  const img=make("img","thread-fid-photo-preview");
  img.src=url;img.alt=title;img.loading="lazy";
  card.append(img,make("strong",null,title));
  return card;
}
const newCandidateId=()=>`visual_age_candidate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;

/** Each age is optional; exactly one root remains authoritative at age 25. */
export function renderVisualAgeAnchors({threadId,threadName}={}){
  const root=make("section","thread-visual-age-anchors");
  root.append(make("h3",null,"Age portraits"));
  root.append(make("p","thread-empty-note",
    "The age-25 portrait is the canonical identity. Approved portraits at other ages guide future depictions, without changing the person."));
  const gallery=make("div","thread-fid-visuals");
  const actions=make("div","thread-observatory-actions");
  const ageLabel=make("label",null,"Portrait age");
  const ageInput=make("input","thread-age-anchor-input");
  ageInput.type="number";ageInput.min="3";ageInput.max="95";ageInput.step="1";ageInput.value="15";
  ageLabel.append(ageInput);
  const generate=make("button","secondary thread-repair-button","Generate age portrait");
  generate.type="button";
  actions.append(ageLabel,generate);
  const status=make("p","thread-empty-note","");
  status.setAttribute("role","status");
  const review=make("div","thread-fid-visuals");
  root.append(actions,status,gallery,review);

  async function reload(){
    const info=await api(base(threadId));
    const anchors=info.anchors??[];
    gallery.replaceChildren(portrait(base(threadId)+"/canonical","Canonical · 25"));
    for(const anchor of anchors){
      gallery.append(portrait(
        base(threadId)+"/portraits/"+encodeURIComponent(anchor.admissionId),
        `Age ${anchor.targetAgeYears}`,
      ));
    }
    status.textContent=anchors.length
      ?`${anchors.length} approved age ${anchors.length===1?"portrait":"portraits"} available.`
      :"No additional age portraits have been approved.";
  }
  void reload().catch(error=>{status.textContent="Age portraits unavailable: "+error.message;});

  let pending=null;
  async function showCandidate(candidateId,targetAgeYears){
    const prefix=base(threadId)+"/candidates/"+encodeURIComponent(candidateId);
    review.replaceChildren(
      portrait(base(threadId)+"/canonical","Canonical · 25"),
      portrait(prefix+"/portrait",`Proposed · ${targetAgeYears}`),
    );
    const approve=make("button","primary thread-repair-button","Approve age portrait");
    approve.type="button";
    const discard=make("button","secondary thread-repair-button","Discard candidate");
    discard.type="button";
    discard.addEventListener("click",()=>{
      review.replaceChildren();pending=null;generate.disabled=false;
      status.textContent="Candidate discarded; canonical identity is unchanged.";
    });
    approve.addEventListener("click",()=>{
      openThreadActionDialog({
        threadId,threadName,
        label:`Approve age ${targetAgeYears} portrait`,
        eyebrow:"Fibre visual identity",
        description:"Admit this generated image as a reusable age reference. It will never replace the canonical age-25 portrait.",
        run:async()=>{
          approve.disabled=true;
          try{
            await api(prefix+"/admit",{method:"POST"});
            pending=null;review.replaceChildren();generate.disabled=false;
            await reload();
          }catch(error){
            approve.disabled=false;
            status.textContent="Age portrait admission failed: "+error.message;
            throw error;
          }
        },
      });
    });
    review.append(approve,discard);
    status.textContent=`Review the proposed age-${targetAgeYears} portrait against the canonical identity.`;
  }
  async function waitForCandidate(candidateId,targetAgeYears){
    const prefix=base(threadId)+"/candidates/"+encodeURIComponent(candidateId);
    for(let attempt=0;attempt<40;attempt++){
      const outcome=await api(prefix);
      if(outcome.state==="ready"||outcome.state==="admitted"){
        await showCandidate(candidateId,targetAgeYears);
        return;
      }
      if(outcome.state==="unavailable")throw new Error("The image provider did not produce an age portrait.");
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
    generate.disabled=false;
    status.textContent="Still generating; this candidate can be resumed without requesting a new image.";
  }
  generate.addEventListener("click",()=>{
    const targetAgeYears=ageInput.valueAsNumber;
    if(!Number.isInteger(targetAgeYears)||targetAgeYears<3||targetAgeYears>95){
      status.textContent="Select a whole-year age from 3 to 95.";return;
    }
    if(targetAgeYears===25){
      status.textContent="Age 25 is already the canonical root.";return;
    }
    openThreadActionDialog({
      threadId,threadName,label:`Generate age ${targetAgeYears} portrait`,
      eyebrow:"Fibre visual identity",
      description:"Generate one new OpenAI portrait from the canonical identity and any nearby admitted age anchors. Nothing is admitted until you approve the result.",
      run:async()=>{
        const candidateId=pending?.targetAgeYears===targetAgeYears
          ? pending.candidateId : newCandidateId();
        pending={candidateId,targetAgeYears};
        generate.disabled=true;
        status.textContent=`Generating age-${targetAgeYears} candidate…`;
        try{
          await api(base(threadId)+"/candidates/"+encodeURIComponent(candidateId),{
            method:"POST",body:{targetAgeYears},
          });
          void waitForCandidate(candidateId,targetAgeYears).catch(error=>{
            generate.disabled=false;status.textContent="Age portrait: "+error.message;
          });
        }catch(error){
          generate.disabled=false;
          status.textContent="Age portrait: "+error.message;
          throw error;
        }
      },
    });
  });
  return root;
}
