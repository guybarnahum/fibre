import {openThreadActionDialog} from "./thread-action-dialog.js";
import {setWaitingContent} from "./fa-icons.js";

const make=(tag,className,text)=>{
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
};
const base=threadId=>`/api/threads/${encodeURIComponent(threadId)}/age-anchors`;
const candidateUrl=(threadId,candidateId)=>base(threadId)+"/candidates/"+encodeURIComponent(candidateId);
const newCandidateId=()=>`visual_age_candidate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

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
  const img=make("img","thread-age-anchor-portrait");
  img.src=url;img.alt=title;img.loading="lazy";
  card.append(img,make("strong",null,title));
  return card;
}

/** Candidate state comes from admitted storage, not from this disposable view. */
export function renderVisualAgeAnchors({threadId,threadName}={}){
  const root=make("section","thread-visual-age-anchors");
  root.append(make("h3",null,"Age portraits"));
  root.append(make("p","thread-person-summary",
    "The age-25 portrait is the canonical identity. Approved portraits at other ages guide future depictions, without changing the person."));

  const actions=make("div","thread-age-anchor-actions");
  const ageLabel=make("label","thread-age-anchor-field","Portrait age");
  const ageInput=make("input","thread-age-anchor-input");
  ageInput.type="number";ageInput.min="3";ageInput.max="95";ageInput.step="1";ageInput.value="15";
  ageLabel.append(ageInput);
  const generate=make("button","secondary thread-repair-button","Generate age portrait");
  generate.type="button";
  actions.append(ageLabel,generate);

  const status=make("div","thread-action-status thread-age-anchor-status");
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  status.hidden=true;
  const galleryStatus=make("p","thread-empty-note","");
  const gallery=make("div","thread-age-anchor-gallery");
  const review=make("div","thread-age-anchor-review");
  root.append(actions,status,galleryStatus,gallery,review);

  let active=null;
  let pollSequence=0;

  function message(text,kind=""){
    status.hidden=false;
    status.className="thread-action-status thread-age-anchor-status"+(kind?" "+kind:"");
    status.textContent=text;
  }
  function working(text){
    status.hidden=false;
    status.className="thread-action-status thread-age-anchor-status working";
    setWaitingContent(status,text);
    const progress=make("div","thread-action-progress");
    progress.append(make("span"));
    status.append(progress);
  }
  function settle(){
    active=null;
    ++pollSequence;
    generate.disabled=false;
    generate.textContent="Generate age portrait";
    galleryStatus.hidden=false;
  }
  async function previewReady(id){
    // A ready workflow is not a usable candidate until the immutable asset
    // and its provider/canonical provenance pass the admission verifier.
    const response=await fetch(candidateUrl(threadId,id)+"/portrait",{cache:"no-store"});
    if(!response.ok){
      const result=await response.json().catch(()=>null);
      throw new Error(result?.detail??result?.error??`Portrait preview HTTP ${response.status}`);
    }
  }
  async function showCandidate(id,age,sequence){
    await previewReady(id);
    if(sequence!==pollSequence||!root.isConnected)return;
    const prefix=candidateUrl(threadId,id);
    review.replaceChildren(
      portrait(base(threadId)+"/canonical","Canonical · 25"),
      portrait(prefix+"/portrait",`Proposed · age ${age}`),
    );
    const approve=make("button","primary thread-repair-button","Approve age portrait");
    approve.type="button";
    const discard=make("button","secondary thread-repair-button","Discard candidate");
    discard.type="button";
    discard.addEventListener("click",async()=>{
      discard.disabled=true;
      try{
        await api(prefix+"/discard",{method:"POST"});
        if(!root.isConnected)return;
        review.replaceChildren();
        settle();
        message("Candidate discarded. Canonical identity is unchanged.");
      }catch(error){
        discard.disabled=false;
        message("Could not discard candidate: "+error.message,"failed");
      }
    });
    approve.addEventListener("click",()=>{
      openThreadActionDialog({
        threadId,threadName,
        label:`Approve age ${age} portrait`,
        eyebrow:"Fibre visual identity",
        description:"Admit this verified image as a reusable age reference. The canonical age-25 portrait will not change.",
        run:async()=>{
          const admission=await api(prefix+"/admit",{method:"POST"});
          if(!root.isConnected)return;
          review.replaceChildren();
          settle();
          await reload();
          message(`Age-${admission.targetAgeYears} portrait approved and available.`,"succeeded");
        },
      });
    });
    const buttons=make("div","thread-age-anchor-review-actions");
    buttons.append(approve,discard);
    review.append(buttons);
    generate.disabled=false;
    generate.textContent="Generate another age portrait";
    message(`Age-${age} portrait ready. Review the image before approving.`,"succeeded");
  }
  async function watchCandidate(candidate){
    const sequence=++pollSequence;
    const {candidateId,targetAgeYears}=candidate;
    active=candidate;
    ageInput.value=String(targetAgeYears);
    generate.disabled=true;
    galleryStatus.hidden=true;
    review.replaceChildren();
    working(`Generating age-${targetAgeYears} candidate…`);
    for(let attempt=0;attempt<75;attempt++){
      if(sequence!==pollSequence||!root.isConnected)return;
      try{
        const result=await api(candidateUrl(threadId,candidateId));
        if(sequence!==pollSequence||!root.isConnected)return;
        if(result.state==="ready"||result.state==="admitted"){
          await showCandidate(candidateId,targetAgeYears,sequence);
          return;
        }
        if(result.state==="unavailable")throw new Error("Image generation completed without a usable portrait");
        if(result.state!=="pending")throw new Error("Unexpected generation state: "+result.state);
      }catch(error){
        if(sequence!==pollSequence||!root.isConnected)return;
        generate.disabled=false;
        generate.textContent="Retry age portrait";
        message(`Age-${targetAgeYears} portrait: ${error.message}`,"failed");
        return;
      }
      await wait(4000);
    }
    if(sequence!==pollSequence||!root.isConnected)return;
    generate.disabled=false;
    generate.textContent="Check age portrait";
    message(`Age-${targetAgeYears} is still generating. Choose Check age portrait to resume.`);
  }
  async function reload(){
    const info=await api(base(threadId));
    if(!root.isConnected)return;
    const anchors=info.anchors??[];
    gallery.replaceChildren(portrait(base(threadId)+"/canonical","Canonical · 25"));
    for(const anchor of anchors){
      gallery.append(portrait(
        base(threadId)+"/portraits/"+encodeURIComponent(anchor.admissionId),
        `Age ${anchor.targetAgeYears}`,
      ));
    }
    galleryStatus.textContent=anchors.length
      ?`${anchors.length} approved age ${anchors.length===1?"portrait":"portraits"} available.`
      :"No approved age portraits yet.";
    galleryStatus.hidden=active!==null;
    // Observatory gets replaced by live updates and deferred-history loading.
    // Each new view resumes the latest durable candidate, even after refresh.
    if(active===null&&(info.candidates?.length??0)>0){
      void watchCandidate(info.candidates[0]);
    }
  }
  void reload().catch(error=>{
    if(root.isConnected)message("Age portraits could not load: "+error.message,"failed");
  });

  generate.addEventListener("click",()=>{
    const targetAgeYears=ageInput.valueAsNumber;
    if(!Number.isInteger(targetAgeYears)||targetAgeYears<3||targetAgeYears>95){
      message("Select a whole-year age from 3 to 95.","failed");return;
    }
    if(targetAgeYears===25){
      message("Age 25 is already the canonical root.");return;
    }
    if(active?.targetAgeYears===targetAgeYears){
      // Resume the same immutable candidate; do not pay for a second image.
      void watchCandidate(active);
      return;
    }
    openThreadActionDialog({
      threadId,threadName,label:`Generate age ${targetAgeYears} portrait`,
      eyebrow:"Fibre visual identity",
      description:"Generate one OpenAI portrait using the canonical identity and nearby approved age anchors. Admission requires your separate review and approval.",
      run:async()=>{
        const candidateId=newCandidateId();
        const candidate={candidateId,targetAgeYears};
        active=candidate;
        generate.disabled=true;
        galleryStatus.hidden=true;
        working(`Generating age-${targetAgeYears} candidate…`);
        try{
          await api(candidateUrl(threadId,candidateId),{
            method:"POST",body:{targetAgeYears},
          });
        }catch(error){
          if(root.isConnected){
            active=null;
            generate.disabled=false;
            galleryStatus.hidden=false;
            message("Age portrait request failed: "+error.message,"failed");
          }
          throw error;
        }
        if(root.isConnected)void watchCandidate(candidate);
      },
    });
  });
  return root;
}
