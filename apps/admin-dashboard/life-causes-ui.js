import {fetchThreadObservatory,renderThreadLifeHistory,threadName} from "./thread-observatory.js";
import {recentLifeMoments,recordedLifeMoments,formativeLifeMoments} from "./life-causes-model.mjs";

const $=selector=>document.querySelector(selector);
const el=(tag,className=null,value=null)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==null)node.textContent=String(value);
  return node;
};
const at=value=>value&&Number.isFinite(Date.parse(value))
  ?new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})
  :"Time not established";
const day=value=>new Date(/^\d{4}-\d{2}-\d{2}$/u.test(value)
  ?value+"T12:00:00":value).toLocaleDateString(undefined,{
  weekday:"short",month:"short",day:"numeric",year:"numeric",
});
const validThread=value=>/^thr_[a-zA-Z0-9]+$/u.test(value??"");
const labelFor=item=>item.kind==="formative_event"?"Admitted childhood event"
  :item.kind==="origin"?"Origin fact"
  :item.kind==="social_interaction"?"Social response"
  :item.kind==="social_choice"?"Social choice"
  :item.kind==="memory"?"Memory"
  :item.kind==="encounter"?"Encounter"
  :item.kind==="world"?"World occurrence"
  :item.phase==="in_transit"?"Travel":"World situation";
const titleFor=item=>item.publicVenueName
  ?item.publicVenueName+(item.activity?" · "+item.activity:"")
  :item.title??item.activity??(item.phase==="in_transit"?"In transit":"Enacted situation");

export function renderLifeCausesPage(){
  document.title="Fibre Admin · Life & Causes";
  for(const selector of [".metrics",".filters-panel",".activity-view-panel",
    ".activity-pager","#appearance-view"]){
    const node=$(selector);if(node)node.hidden=true;
  }
  $(".crumbs")?.lastElementChild?.replaceChildren("Life & Causes");
  for(const link of document.querySelectorAll(".nav-item")){
    link.classList.toggle("active",link.getAttribute("href")==="/life");
  }

  const head=$(".page-head");
  head.replaceChildren();
  const intro=el("div");
  intro.append(el("p","eyebrow","Life Observatory"),el("h1",null,"Life & Causes"),
    el("p","lede","An individual life, its choices, and evidence of what followed."));
  head.append(intro);

  const workspace=el("section","panel life-causes-workspace");
  const subject=el("form","life-causes-subject");
  const subjectLabel=el("label",null,"Thread");
  const input=el("input");
  input.name="thread";input.autocomplete="off";input.placeholder="thr_…";
  input.setAttribute("aria-label","Thread ID");
  subjectLabel.append(input);
  const inspect=el("button","primary","Inspect life");inspect.type="submit";
  const choose=el("a","button-link secondary","Choose from Threads ↗");
  choose.href="/activity?mode=threads";
  subject.append(subjectLabel,inspect,choose);

  const summary=el("div","life-causes-summary");
  const scopes=el("nav","life-causes-scopes");
  scopes.setAttribute("aria-label","Life history scope");
  const recent=el("button","secondary","Recent life");
  const historyButton=el("button","secondary","Recorded history");
  const originsButton=el("button","secondary","Origins");
  for(const button of [recent,historyButton,originsButton])button.type="button";
  scopes.append(recent,historyButton,originsButton);
  const layout=el("div","life-causes-layout");
  const timeline=el("section","life-causes-timeline");
  const inspector=el("section","life-causes-inspector");
  layout.append(timeline,inspector);
  const source=el("div","life-causes-original");
  workspace.append(subject,summary,scopes,layout,source);
  $(".main").append(workspace);

  let threadId=null,loadedRecent=null,loadedHistory=null,loadedOrigins=null;
  let mode="recent",selected=null,sequence=0,missingRequested=null,historyFailure=null;
  const text=(target,message,cls="life-causes-muted")=>{
    target.replaceChildren(el("p",cls,message));
  };
  const activeMoments=()=>mode==="origins"
    ?loadedOrigins?.moments??[]
    :mode==="history"?loadedHistory?.moments??[]
      :loadedRecent?.moments??[];
  const bodyLines=interoception=>interoception===null
    ?["No planning-time Body signal was supplied."]
    :interoception===undefined
      ?["No decision-time Body witness was retained."]
      :[
        ...(interoception.drives??[]).map(drive=>
          drive.family+" pressure "+drive.pressure+
          (drive.orientation?" · "+drive.orientation:"")),
        "Regulatory evidence: "+(interoception.evidenceRefs??[]).join(", "),
        "Pressure is an input, not a diagnosis or proven behavioral cause.",
      ];
  const socialLines=(choice,role)=>choice===null
    ?[role+" was not evaluated at this decision boundary."]
    :[
      role+" chose: "+choice.decision,
      choice.reportedReason?"Thread-reported reason: "+choice.reportedReason:null,
      choice.selectedEvidenceRefs?.length
        ?"Selected personal evidence: "+choice.selectedEvidenceRefs.join(", "):null,
    ];
  const evidenceRow=(heading,lines)=>{
    const section=el("section","life-causes-part");
    section.append(el("h3",null,heading));
    for(const line of lines.filter(Boolean))section.append(el("p",null,line));
    inspector.append(section);
  };
  const updateUrl=()=>{
    const next=new URL(location.href);
    if(threadId)next.searchParams.set("thread",threadId);
    next.searchParams.set("view",mode);
    next.searchParams.delete("memory");
    if(selected)next.searchParams.set("moment",selected.kind+":"+selected.id);
    else next.searchParams.delete("moment");
    window.history.replaceState(null,"",next);
  };
  const setMoment=item=>{
    selected=item;missingRequested=null;updateUrl();draw();
  };
  const memoryAge=(item)=>{
    const birth=loadedHistory?.payload?.identity?.birthDate
      ??loadedRecent?.payload?.identity?.birthDate;
    const years=Date.parse(item.at)-Date.parse(birth??"");
    if(!Number.isFinite(years)||years<0)return null;
    return "Age "+Math.floor(years/(365.2425*24*60*60*1000));
  };
  function drawTimeline(){
    const previousScroll=timeline.scrollTop;
    timeline.replaceChildren(el("h2",null,"Life Timeline"));
    if(!loadedRecent){text(timeline,"Choose a Thread to inspect its life.");return;}
    const moments=activeMoments();
    timeline.append(el("p","life-causes-muted",mode==="recent"
      ?"Current World snapshot · at most eight recent enacted situations."
      :mode==="origins"
        ?"Recorded birth facts and retained personal Memories · not complete childhood events or the Genesis execution clock."
        :"Bounded World, Encounter and Memory records · not a complete lifetime archive."));
    if(!moments.length){
      timeline.append(el("p","life-causes-muted","No dated moments in the returned inspection window."));
      return;
    }
    const list=el("div","life-causes-spine");
    let previousDay=null;
    for(const item of moments){
      const group=day(item.at);
      if(group!==previousDay){
        list.append(el("div","life-causes-day",group));
        previousDay=group;
      }
      const card=el("button","life-causes-moment life-causes-kind-"+item.kind);
      card.type="button";card.setAttribute("aria-pressed",String(item===selected));
      card.classList.toggle("selected",item===selected);
      card.append(
        el("time",null,item.kind==="origin"?"Birth date":new Date(item.at).toLocaleTimeString(undefined,{
          hour:"numeric",minute:"2-digit",
        })),
        el("strong",null,titleFor(item)),
        el("small",null,labelFor(item)+(item.planned?" · plan linked":"")
          +(item.kind==="memory"&&memoryAge(item)?" · "+memoryAge(item):"")),
      );
      card.addEventListener("click",()=>setMoment(item));
      list.append(card);
    }
    timeline.append(list);
    timeline.scrollTop=previousScroll;
  }
  function drawInspector(){
    inspector.replaceChildren(el("h2",null,"Selected moment"));
    if(!selected){
      text(inspector,missingRequested
        ?"The requested record ("+missingRequested+") was not returned in this bounded history. This does not establish lifetime absence."
        :"Select an event, experience or Memory from the timeline.");
      return;
    }
    const heading=el("div","life-causes-moment-heading");
    heading.append(el("strong",null,titleFor(selected)),
      el("span",null,labelFor(selected)+" · "+at(selected.at)));
    inspector.append(heading);

    if(selected.kind==="formative_event"){
      evidenceRow("What happened in childhood",[
        selected.title,
        selected.ageAtEvent!==null?"Recorded age: "+selected.ageAtEvent:null,
        "A World-admitted Genesis event, not an event generated by the present operator's inspection.",
      ]);
      evidenceRow("Historical grounding",[
        selected.placeRef?"Place reference: "+selected.placeRef:null,
        selected.participantRefs.length
          ?"Participant references: "+selected.participantRefs.join(", "):null,
        "A historical event is not automatically remembered, meaningful or causally important.",
      ]);
    }else if(selected.kind==="origin"){
      evidenceRow("Birth facts",[
        "Recorded birth date: "+selected.birthDate,
        selected.birthPlace?"Recorded birthplace: "+selected.birthPlace:null,
        "This is an identity fact, not a World encounter or a compiler event.",
      ]);
      evidenceRow("Publication boundary",[
        loadedOrigins?.publicationAt
          ?"World publication: "+at(loadedOrigins.publicationAt)
          :loadedOrigins?.published?"This Thread is admitted; the exact Genesis publication timestamp is not in this view."
            :"World publication not established.",
        "Publication is an execution-clock event, not another childhood episode.",
      ]);
    }else if(selected.kind==="memory"){
      evidenceRow("Remembered",[
        selected.title,
        selected.meaning?"Personal meaning: "+selected.meaning:
          "No separate remembered meaning is available in this record.",
      ]);
      evidenceRow("History and evidence",[
        "This Memory concerns an episode before the World publication boundary. Its subject time is distinct from when the Memory was consolidated.",
        selected.recordedAt?"Memory recorded: "+at(selected.recordedAt):null,
        selected.eventRefs?.length
          ?"Explicit source references: "+selected.eventRefs.join(", ")
          :"No event references returned in this inspection.",
      ]);
      evidenceRow("Consequences",[
        "Retention does not establish that this Memory changed a later decision.",
      ]);
    }else if(selected.kind==="social_interaction"){
      evidenceRow("Before · actual social request",[
        "Initiator: "+selected.initiatorThreadId,
        "Recipient: "+selected.recipientThreadId,
        "Request heard: "+selected.requestText,
      ]);
      evidenceRow("Independently chosen response",[
        "This Thread's role: "+selected.role,
        "Recipient decided: "+selected.responseDecision,
        selected.responseExpression
          ?"Outward response: "+selected.responseExpression:null,
        selected.suggestedAt?"Suggested later time: "+at(selected.suggestedAt):null,
        "The recipient's private reason is not contained in this interaction record.",
      ]);
      evidenceRow("World · evidence boundary",[
        "A recorded social request and reply is not by itself proof that a conversation followed.",
        "Inspect an admitted Encounter Story separately for actual speech and each person's Experience.",
      ]);
    }else if(selected.kind==="social_choice"){
      const decision=selected.decision;
      evidenceRow("Before · grounded social opportunity",[
        "A social consideration was completed against an enacted situation.",
        "Situation: "+selected.situationId,
        decision?.counterpartyThreadId
          ?"Observed candidate: "+decision.counterpartyThreadId:null,
        decision?.salience?"Salience: "+decision.salience.outcome
          +" · "+(decision.salience.anchors??[]).join(", "):
          "No salience evidence was retained for this attempt.",
        ...(decision?.initiation?bodyLines(decision.initiation.decisionContext?.interoception):[]),
      ]);
      evidenceRow("Decision · individually authored",[
        ...socialLines(decision?.initiation??null,"Initiator"),
        ...socialLines(decision?.response??null,"Recipient"),
      ]);
      evidenceRow("World · outcome",[
        "Recorded outcome: "+selected.outcome,
        decision?.encounterRef
          ?"Admitted Encounter Story: "+decision.encounterRef
          :"No admitted conversation is established by this opportunity.",
        "Not initiating, declining and background attention are meaningful non-actions.",
      ]);
      const admitted=loadedHistory?.moments.find(item=>
        item.id===decision?.encounterRef&&item.kind==="encounter");
      if(admitted){
        const open=el("button","secondary","Inspect admitted conversation →");
        open.type="button";
        open.addEventListener("click",()=>setMoment(admitted));
        inspector.append(open);
      }
    }else if(selected.kind==="encounter"||selected.kind==="world"){
      evidenceRow("What happened",[
        "An admitted Encounter Story records this event in a World situation.",
        selected.occurrenceText?selected.occurrenceText:null,
      ]);
      if(selected.dialogue.length){
        evidenceRow("Outward interaction",selected.dialogue.map(
          beat=>beat.speaker+": "+beat.text,
        ));
      }
      if(selected.socialDecision){
        evidenceRow("Why they talked · decision evidence",[
          "The initiator's social choice is linked to this admitted Story.",
          "Salience anchors: "+(selected.socialDecision.salience?.anchors??[]).join(", "),
          ...bodyLines(selected.socialDecision.initiation?.decisionContext?.interoception),
          ...socialLines(selected.socialDecision.initiation??null,"Initiator"),
          ...socialLines(selected.socialDecision.response??null,"Recipient"),
          "Reported reasons describe each person's perspective, not a proven unconscious cause.",
        ]);
      }
      evidenceRow("This person's experience",[ 
        selected.attention==="noticed"?"Attention recorded: noticed."
          :selected.attention==="not_noticed"?"Attention recorded: not noticed."
          :"Attention was not established by this record.",
        selected.experienceText??"No personal Experience text established here.",
      ]);
      evidenceRow("After",[
        selected.memoryLinks.length
          ?"Explicit retained-Memory links: "+selected.memoryLinks.join(", ")
          :"No linked Memory was identified in this bounded inspection.",
        "A linked Memory is not yet proof of influence on a later choice.",
      ]);
    }else{
      evidenceRow("Before · conditions",[
        selected.planned?"Linked authored Flight Plan: "+at(selected.planned.authoredAt)
          :"No matching Flight Plan was identified for this situation.",
        ...(selected.planned?.decisionContext?[
          "Actual decision-time context was retained with the Flight Plan.",
          ...bodyLines(selected.planned.decisionContext.interoception),
          "Offered World places: "+selected.planned.decisionContext.offeredPlaceRefs.join(", "),
          "City Guide suggestions offered: "+(
            selected.planned.decisionContext.cityGuidePlaceRefs.join(", ")||"none"),
          selected.planned.selectedEvidenceRefs?.length
            ?"Selected personal evidence: "+selected.planned.selectedEvidenceRefs.join(", "):null,
          "A City Guide listing is exposure, not evidence that it caused the visit.",
        ]:["Decision-time Body and City Guide inputs were not retained for this historical plan."]),
      ]);
      evidenceRow("Decision · intention",selected.planned?[
        selected.planned.purpose?"Stated purpose: "+selected.planned.purpose
          :"No stated purpose found for the matched stop.",
        selected.planned.activity?"Planned activity: "+selected.planned.activity:null,
      ]:["An enacted situation does not independently explain its motivation."]);
      evidenceRow("World · what happened",[
        (selected.phase==="at_place"?"Presence enacted"
          :selected.phase==="in_transit"?"Travel enacted"
          :"World situation admitted")+" · "+at(selected.at),
        selected.placeKind==="verified_public"||selected.placeKind==="world_place"
          ?"World place referenced; historical venue identity may require deeper authority."
          :selected.placeKind==="private_or_unverified"
            ?"Private or otherwise unverified place; no public venue inferred."
            :"Location authority is not established in this record.",
      ]);
      evidenceRow("After · consequences",[
        "No causal claim follows solely from what happened later.",
        mode==="recent"?"Inspect Recorded history for bounded Encounter and Memory evidence.":null,
      ]);
    }
    const refs=el("details","life-causes-evidence");
    refs.append(el("summary",null,"Source references"),
      el("p",null,labelFor(selected)+": "+selected.id));
    if(selected.planned?.planId)refs.append(el("p",null,
      "Flight Plan: "+selected.planned.planId));
    if(selected.experienceId)refs.append(el("p",null,
      "Experience: "+selected.experienceId));
    inspector.append(refs);
    const back=el("a","button-link secondary","Open Thread details ↗");
    back.href="/thread/"+encodeURIComponent(threadId);
    inspector.append(back);
  }
  function drawOriginalRecords(){
    source.replaceChildren();
    if(mode!=="history"||!loadedHistory)return;
    const disclosure=el("details","life-causes-original-details");
    disclosure.append(el("summary",null,
      "Explore original Journal, Encounter, Memory and social records"));
    disclosure.addEventListener("toggle",()=>{
      if(!disclosure.open||disclosure.dataset.rendered)return;
      disclosure.dataset.rendered="true";
      disclosure.append(renderThreadLifeHistory({
        ...loadedHistory.payload,threadId:loadedHistory.threadId,
      }));
    });
    source.append(disclosure);
  }
  function draw(){
    recent.classList.toggle("active",mode==="recent");
    historyButton.classList.toggle("active",mode==="history");
    originsButton.classList.toggle("active",mode==="origins");
    scopes.hidden=!loadedRecent;
    drawTimeline();drawInspector();drawOriginalRecords();
  }
  async function loadHistory(requested=null){
    if(!loadedRecent||!threadId)return;
    const targetThread=threadId;
    const request=sequence;
    mode="history";historyButton.disabled=true;originsButton.disabled=true;
    summary.append(el("span",null,"Reading bounded history…"));
    draw();
    try{
      if(!loadedHistory){
        const payload=await fetchThreadObservatory(targetThread);
        if(request!==sequence)return;
        if(payload.encounterError)throw new Error(payload.encounterError);
        loadedHistory={
          threadId:targetThread,payload,
          moments:recordedLifeMoments({...payload,threadId:targetThread}),
        };
        // Genesis history has a separate, cheaper, origins-only World read.
      }
      if(request!==sequence)return;
      const moments=activeMoments();
      const match=requested?moments.find(item=>
        item.kind+":"+item.id===requested||item.id===requested,
      )??null:null;
      missingRequested=requested&&!match?requested:null;
      selected=requested?match:moments[0]??null;
      historyFailure=null;
      if(!missingRequested)updateUrl();
    }catch(error){
      if(request!==sequence)return;
      mode="recent";selected=loadedRecent.moments[0]??null;
      historyFailure="History inspection unavailable: "+(error instanceof Error?error.message:String(error));
      updateUrl();
    }finally{
      if(request===sequence){historyButton.disabled=false;originsButton.disabled=false;drawSummary();draw();}
    }
  }
  async function loadOrigins(requested=null){
    if(!loadedRecent||!threadId)return;
    const request=sequence,targetThread=threadId;
    mode="origins";originsButton.disabled=true;
    draw();
    try{
      if(!loadedOrigins){
        const response=await fetch(
          "/api/threads/"+encodeURIComponent(targetThread)+"/observatory?view=origins",
          {headers:{Accept:"application/json"},cache:"no-store"},
        );
        const data=await response.json().catch(()=>null);
        if(!response.ok)throw new Error(data?.detail??data?.error?.code
          ??data?.error??"HTTP "+response.status);
        if(request!==sequence)return;
        const origin=data?.observatory;
        if(origin?.threadId!==targetThread||origin.origin?.admitted!==true){
          throw new Error("No admitted Origins evidence for this Thread.");
        }
        loadedOrigins={
          published:true,
          moments:formativeLifeMoments({
            identity:loadedRecent.payload.identity,
            memories:origin.memories??[],
            genesisEpisodes:origin.origin.genesisEpisodes??[],
            publicationAt:origin.origin.publication?.occurredAt??null,
          }),
          publicationAt:origin.origin.publication?.occurredAt??null,
          coverage:origin.origin,
        };
      }
      const match=requested?loadedOrigins.moments.find(item=>
        item.kind+":"+item.id===requested||item.id===requested,
      )??null:null;
      missingRequested=requested&&!match?requested:null;
      selected=requested?match:loadedOrigins.moments[0]??null;
      if(!missingRequested)updateUrl();
    }catch(error){
      if(request!==sequence)return;
      mode="recent";selected=loadedRecent.moments[0]??null;
      historyFailure="Origins inspection unavailable: "
        +(error instanceof Error?error.message:String(error));
      updateUrl();
    }finally{
      if(request===sequence){originsButton.disabled=false;drawSummary();draw();}
    }
  }
  function drawSummary(){
    summary.replaceChildren();
    if(loadedRecent){
      summary.append(el("strong",null,threadName(loadedRecent.payload.identity)??threadId),
        el("span",null,"One person · read-only World evidence · bounded history"));
    }
    if(historyFailure)summary.append(el("p","error-box",historyFailure));
  }
  async function openThread(nextThread,{moment=null,memory=null,view="recent"}={}){
    const request=++sequence;
    threadId=nextThread;loadedRecent=null;loadedHistory=null;loadedOrigins=null;selected=null;
    historyFailure=null;missingRequested=null;
    mode="recent";summary.replaceChildren(el("span",null,"Reading current World life…"));draw();
    try{
      const payload=await fetchThreadObservatory(nextThread,{currentOnly:true});
      if(request!==sequence)return;
      if(payload.encounterError)throw new Error(payload.encounterError);
      loadedRecent={payload,moments:recentLifeMoments(payload.livedNow)};
      selected=loadedRecent.moments.find(item=>
        item.kind+":"+item.id===moment||item.id===moment,
      )??loadedRecent.moments[0]??null;
      drawSummary();draw();
      if(view==="origins")await loadOrigins(moment);
      else if(view==="history"||memory)await loadHistory(memory??moment);
      else updateUrl();
    }catch(error){
      if(request!==sequence)return;
      summary.replaceChildren(el("p","error-box",
        "Could not inspect this Thread: "+(error instanceof Error?error.message:String(error))));
      draw();
    }
  }
  recent.addEventListener("click",()=>{
    if(!loadedRecent)return;
    mode="recent";selected=loadedRecent.moments[0]??null;
    updateUrl();draw();
  });
  originsButton.addEventListener("click",()=>{
    if(!loadedRecent||originsButton.disabled)return;
    if(loadedOrigins){
      mode="origins";selected=loadedOrigins.moments[0]??null;
      updateUrl();draw();
    }else void loadOrigins();
  });
  historyButton.addEventListener("click",()=>{
    if(!loadedRecent||historyButton.disabled)return;
    if(loadedHistory){
      mode="history";selected=loadedHistory.moments[0]??null;
      updateUrl();draw();
    }else void loadHistory();
  });
  subject.addEventListener("submit",event=>{
    event.preventDefault();
    const next=input.value.trim();
    if(!validThread(next)){text(summary,"Enter a valid Thread ID or choose from Threads.");return;}
    const url=new URL(location.href);
    url.searchParams.set("thread",next);
    url.searchParams.delete("memory");
    url.searchParams.delete("moment");
    url.searchParams.delete("view");
    window.history.pushState(null,"",url);
    void openThread(next);
  });

  const params=new URLSearchParams(location.search);
  const initial=params.get("thread");
  if(validThread(initial)){
    input.value=initial;
    void openThread(initial,{
      moment:params.get("moment"),memory:params.get("memory"),
      view:params.get("view")??"recent",
    });
  }else draw();
}
