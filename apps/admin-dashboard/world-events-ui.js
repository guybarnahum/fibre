import {mountWorldMap,worldMapPoint,SVG_NS} from "./world-map-ui.js";
import {createThreadIdentityViewer} from "./thread-person-ui.js";
import "./thread-popup-links.js";
import {createCopyButton} from "./copy-action.js";
import {worldVenueTileScene} from "./world-events-map.js";
import {
  worldEventPlaceTimeline,worldEventPlaceDayRecord,worldVenueCoPresence,
} from "./world-events-records.js";
import {
  formatWorldEventTime,formatWorldTimeRange,worldCityTimeZone,
} from "./world-event-time.js";

const $=selector=>document.querySelector(selector);
const el=(tag,className=null,value=null)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==null)node.textContent=String(value);
  return node;
};
const svgNode=(tag,attributes={})=>{
  const node=document.createElementNS(SVG_NS,tag);
  for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));
  return node;
};
const pretty=value=>String(value??"").replaceAll("_"," ").replace(/\b\w/gu,c=>c.toUpperCase());
const bounded=overview=>Object.entries(overview?.coverage??{}).some(([key,value])=>
  key.endsWith("Truncated")&&value===true);
const windowText=overview=>`last ${overview.hours}h${bounded(overview)?" · capped sample":""}`;
export function worldEventDebugRecord(overview,event){
  return {contract:overview.contract,asOf:overview.asOf,hours:overview.hours,
    coverage:overview.coverage,event};
}
export function worldEventThreadEvidence(event){
  const actors=new Set(event.actorThreadIds??(event.actorThreadId?[event.actorThreadId]:[]));
  const witnesses=new Map((event.witnesses??[]).map(item=>[item.threadId,item]));
  return [...new Set([...actors,...witnesses.keys()])].sort().map(threadId=>{
    const witness=witnesses.get(threadId)??null;
    return {
      threadId,acted:actors.has(threadId),
      attention:["noticed","not_noticed"].includes(witness?.attention)
        ?witness.attention:"not_appraised",
      experienceId:witness?.experienceId??null,
      memoryLinks:[...new Set(witness?.memoryLinks??
        (witness?.memoryLink?[witness.memoryLink]:[]))],
      impactLink:witness?.impactLink??null,
    };
  });
}

export function activeWorldEventCities(snapshot){
  return (snapshot?.cities??[]).filter(city=>city.eventCount>0);
}

export function renderWorldEventsPage(){
  const main=$(".main"),heading=$(".page-head"),crumb=$(".crumbs");
  if(!main||!heading)return;
  document.title="Fibre Admin · World Events";
  for(const selector of [".metrics",".filters-panel",".activity-view-panel",".activity-pager","#appearance-view"]){
    const node=$(selector);if(node)node.hidden=true;
  }
  if(crumb)crumb.lastElementChild.textContent="World Events";
  for(const link of document.querySelectorAll(".nav-item"))link.classList.toggle("active",link.getAttribute("href")==="/world-events");
  heading.replaceChildren();
  const headingText=el("div");
  headingText.append(el("p","eyebrow","God's view"),el("h1",null,"World Events"),
    el("p","lede","Where things actually happened, who could perceive them, and what each life recorded."));
  const actions=el("div","page-actions");
  const hoursLabel=el("label","world-events-window");
  hoursLabel.append(el("span",null,"Window"));
  const hours=el("select");hours.setAttribute("aria-label","World event history window");
  for(const value of [1,6,24,72,168]){
    const option=el("option",null,value>=24?`${value/24} day${value===24?"":"s"}`:`${value} hour${value===1?"":"s"}`);
    option.value=String(value);if(value===24)option.selected=true;hours.append(option);
  }
  hoursLabel.append(hours);
  const refresh=el("button","primary","Refresh");refresh.type="button";
  async function readWorldDay(){
    if(snapshot?.hours===24)return snapshot;
    const response=await fetch("/api/world-events?hours=24",{
      headers:{Accept:"application/json"},cache:"no-store",
    });
    if(!response.ok)throw Error("World 24-hour snapshot unavailable");
    const day=await response.json();
    if(day?.contract!=="fibre-world-event-observatory-v0.1"){
      throw Error("World event contract mismatch");
    }
    return day;
  }
  const copyDay=createCopyButton({
    label:"Copy 24-hour World events",tooltip:"Copy all returned World events for the last 24 hours as JSON (bounded sample)",
    value:async()=>({...await readWorldDay(),scope:"rolling_24_hours",
      note:"Bounded World response; counts may omit older or truncated records."}),
  });
  actions.append(hoursLabel,copyDay,refresh);
  heading.append(headingText,actions);

  const surface=el("section","world-events-surface");
  const summary=el("p","world-events-summary","Reading World history…");
  const mapPanel=el("section","panel world-events-main-map-panel");
  const mapTitle=el("div","world-events-panel-title");
  mapTitle.append(el("h2",null,"Living geography"),
    el("span",null,"Pulse = admitted event, not a scheduled opportunity"));
  const mapWrap=el("div","thread-world-map world-events-world-map");
  mapWrap.setAttribute("aria-label","World map of verified public places and recent admitted events");
  mapPanel.append(mapTitle,mapWrap);
  const world=mountWorldMap(mapWrap);
  const cityBar=el("div","world-events-city-bar");
  const cityTitle=el("h2",null,"Choose a city");
  const cityStatus=el("p",null,"Map markers represent World-verified public venues.");
  cityBar.append(cityTitle,cityStatus);
  const drill=el("div","world-events-drill");
  const cityPanel=el("section","panel world-events-place-panel");
  const cityDescription=el("p","world-events-muted","Select a city to see real place coordinates.");
  const cityMap=el("div","world-events-local-map");
  const places=el("div","world-events-place-list");
  const appearance=el("section","world-events-appearance");
  cityPanel.append(cityDescription,cityMap,places,appearance);
  const timelinePanel=el("section","panel world-events-timeline-panel");
  const timelineHead=el("div","world-events-panel-title");
  const timelineTitle=el("h2",null,"World timeline");
  const timelineCount=el("span");
  const placeDayCopy=createCopyButton({
    label:"Copy venue day JSON",
    tooltip:"Copy selected venue's last 24 hours of returned events as JSON (bounded sample)",
    value:async()=>{
      const place=snapshot?.places.find(item=>item.placeRef===selectedPlace);
      if(!place)throw Error("Select a World venue first");
      return worldEventPlaceDayRecord(await readWorldDay(),place);
    },
  });
  placeDayCopy.classList.add("world-events-timeline-copy");
  placeDayCopy.disabled=true;
  const placeDayHint=el("span","world-events-day-copy-hint","24h JSON");
  const timelineControls=el("div","world-events-timeline-controls");
  timelineControls.append(timelineCount,placeDayHint,placeDayCopy);
  timelineHead.append(timelineTitle,timelineControls);
  const presence=el("section","world-events-presence");
  const timeline=el("div","world-events-timeline");
  timelinePanel.append(timelineHead,presence,timeline);
  drill.append(cityPanel,timelinePanel);
  const unlocatedPanel=el("section","panel world-events-unlocated-panel");
  const unlocatedHeading=el("div","world-events-panel-title");
  const unlocatedCount=el("span");
  unlocatedHeading.append(el("h2",null,"Unmapped World occurrences"),unlocatedCount);
  const unlocatedDescription=el("p","world-events-muted",
    "These admitted stories cannot be pinned within this bounded map. Their location may be unknown or outside the sampled venues; an observer's position is not evidence of event origin.");
  const unlocatedTimeline=el("div","world-events-timeline world-events-unlocated-timeline");
  unlocatedPanel.append(unlocatedHeading,unlocatedDescription,unlocatedTimeline);
  const caveat=el("p","world-events-muted world-events-caveat",
    "Read-only · Verified public places only in this initial projection. Memory and later-impact links require independent causal evidence; missing links never mean an actor forgot or was unaffected.");
  surface.append(summary,mapPanel,cityBar,drill,unlocatedPanel,caveat);
  heading.after(surface);

  let snapshot=null,selectedCity=null,selectedPlace=null,loading=false;
  function choosePlace(placeRef){
    selectedPlace=placeRef;
    drawPlaces();
    drawTimeline();
  }
  function chooseCity(key){
    selectedCity=key;
    const city=snapshot?.cities.find(item=>item.key===key);
    const cityPlaces=snapshot?.places.filter(place=>
      [place.countryCode,place.city].join(":")===key)??[];
    selectedPlace=cityPlaces.some(p=>p.placeRef===selectedPlace)
      ?selectedPlace:(cityPlaces.find(p=>p.eventCount>0)??cityPlaces[0])?.placeRef??null;
    cityTitle.textContent=city?`${city.name}, ${city.country}`:"Choose a city";
    cityStatus.textContent=city
      ?`${city.eventCount} shown · ${windowText(snapshot)} · ${city.placeCount} verified places`
      :"Select a city to explore places.";
    cityStatus.title=city?formatWorldTimeRange(
      snapshot,worldCityTimeZone(snapshot,key)):"";
    drawWorldMap();
    drawPlaces();
    drawTimeline();
  }
  function drawWorldMap(){
    world.markers.replaceChildren();
    if(!snapshot)return;
    for(const city of snapshot.cities){
      const point=worldMapPoint(city.lat,city.long);
      const marker=svgNode("g",{
        transform:`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`,
        tabindex:"0",role:"button", "aria-label":
          `${city.name}, ${city.country}: ${city.eventCount} shown in last ${snapshot.hours}h`,
      });
      marker.classList.add("world-events-city-marker");
      if(city.eventCount>0)marker.classList.add("is-pulsing");
      if(city.key===selectedCity)marker.classList.add("is-selected");
      if(city.eventCount>0)marker.append(svgNode("circle",{r:13,class:"world-events-pulse"}));
      if(city.key===selectedCity)marker.append(svgNode("circle",{r:15,class:"world-events-selection"}));
      marker.append(svgNode("circle",{r:city.key===selectedCity?9:5,class:"world-events-dot"}));
      const caption=svgNode("text",{x:12,y:4,class:"world-events-city-label"});
      caption.textContent=city.name;
      marker.append(caption);
      const title=svgNode("title");
      title.textContent=`${city.name}: ${city.eventCount} shown in last ${snapshot.hours}h`;
      marker.append(title);
      marker.addEventListener("click",()=>chooseCity(city.key));
      marker.addEventListener("keydown",event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();chooseCity(city.key);}
      });
      world.markers.append(marker);
    }
  }
  function drawPlaces(){
    cityMap.replaceChildren();places.replaceChildren();appearance.replaceChildren();
    if(!snapshot||!selectedCity){
      cityDescription.textContent="Select a city to view its World-verified places.";
      return;
    }
    const sites=snapshot.places.filter(p=>[p.countryCode,p.city].join(":")===selectedCity);
    cityDescription.textContent="Verified World venues over a quiet, browser-loaded OpenStreetMap background.";
    if(!sites.length)return;
    const selected=sites.find(p=>p.placeRef===selectedPlace);
    if(selected){
      appearance.append(el("h3",null,"Place · "+selected.name));
      if(selected.description)appearance.append(el("p","world-events-place-description",selected.description));
      const image=selected.appearance;
      if(image){
        appearance.append(el("p","world-events-visual-note",
          "Visual depiction seed · illustrative, not verified physical geometry"));
        const specifics=el("p","world-events-visual-meta",
          `${image.projection==="equirectangular"?"360° panorama":"Perspective"} · ${image.viewpoint}`);
        appearance.append(specifics,el("blockquote","world-events-visual-prompt",image.prompt));
        appearance.append(el("p","world-events-visual-note",image.assetRef
          ?`Generated asset reference: ${image.assetRef} · preview pending asset delivery`
          :"No generated depiction yet"));
      }else{
        appearance.append(el("p","world-events-visual-note",
          "No visual seed or generated depiction recorded for this place."));
      }
    }
    const width=cityMap.clientWidth||480,height=cityMap.clientHeight||310;
    const scene=worldVenueTileScene(sites,width,height);
    const raster=el("div","world-events-tiles");
    for(const tile of scene.tiles){
      const image=el("img","world-events-tile");
      image.alt="";
      image.loading="lazy";
      image.decoding="async";
      image.referrerPolicy="origin";
      image.style.left=tile.left+"px";
      image.style.top=tile.top+"px";
      image.src=tile.url;
      raster.append(image);
    }
    cityMap.append(raster);
    for(const marker of scene.markers){
      const site=marker.site;
      const button=el("button","world-events-map-place");
      button.type="button";
      button.style.left=marker.left+"px";
      button.style.top=marker.top+"px";
      if(site.placeRef===selectedPlace)button.classList.add("is-selected");
      if(site.eventCount>0)button.classList.add("has-events");
      button.title=`${site.name} · ${site.eventCount} shown`;
      button.setAttribute("aria-label",button.title);
      button.append(el("span","world-events-map-dot"));
      if(site.placeRef===selectedPlace)button.append(el("span","world-events-map-name",site.name));
      button.addEventListener("click",()=>choosePlace(site.placeRef));
      cityMap.append(button);
    }
    const attribution=el("a","world-events-map-attribution","© OpenStreetMap contributors");
    attribution.href="https://www.openstreetmap.org/copyright";
    attribution.target="_blank";attribution.rel="noopener noreferrer";
    cityMap.append(attribution);
    for(const site of sites){
      const button=el("button","world-events-place-choice");
      button.type="button";
      if(site.placeRef===selectedPlace)button.classList.add("is-selected");
      const name=el("strong",null,site.name);
      const detail=el("span",null,`${site.eventCount} shown · ${windowText(snapshot)}`);
      detail.title=formatWorldTimeRange(snapshot,site.timeZone);
      button.append(name,detail);
      button.addEventListener("click",()=>choosePlace(site.placeRef));
      places.append(button);
    }
  }
  function worldEventCard(event){
      const place=snapshot?.places.find(site=>site.placeRef===event.placeRef);
      const zone=place?.timeZone??null;
      const card=el("article","world-events-event-card");
      const head=el("div","world-events-event-head");
      head.append(el("span","world-events-event-kind",pretty(event.kind)),
        el("time",null,formatWorldEventTime(event.occurredAt,zone)));
      const summary=el("p","world-events-event-summary",event.summary||"Admitted World event");
      const ref=el("div","world-events-event-ref",event.eventRef);
      const copy=createCopyButton({
        value:()=>worldEventDebugRecord(snapshot,event),label:"Copy event JSON",
        tooltip:"Copy this event's returned JSON and query coverage",
      });
      head.append(copy);
      card.append(head,summary,ref);
      const people=worldEventThreadEvidence(event);
      if(people.length){
        card.append(el("h3",null,"Involved Threads"));
        const scroller=el("div","world-events-involvement-scroll");
        const table=el("table","world-events-involvement");
        const heading=el("tr");
        for(const label of ["Thread","Caused / acted","Noticed","Memory","Later change"]){
          const cell=el("th",null,label);cell.scope="col";heading.append(cell);
        }
        const thead=el("thead");thead.append(heading);
        const body=el("tbody");
        for(const person of people){
          const row=el("tr");
          const identity=el("td","world-events-person-cell");
          identity.append(createThreadIdentityViewer({
            threadId:person.threadId,compact:true,className:"world-events-person",
          }));
          const inspect=el("a","world-events-inspect","Life & Causes ↗");
          inspect.href="/life?thread="+encodeURIComponent(person.threadId)+"&view=history";
          if(event.source==="encounter_story"){
            inspect.href+="&moment="+encodeURIComponent(
              (event.kind==="encounter"?"encounter:":"world:")+event.eventRef);
          }else if(person.acted){
            inspect.href+="&moment="+encodeURIComponent("scene:"+event.eventRef);
          }
          identity.append(inspect);
          if(person.experienceId){
            const experience=el("small","world-events-experience","Experience recorded");
            experience.title="Admitted personal Experience "+person.experienceId;
            identity.append(experience);
          }
          row.append(identity);
          const actor=el("td",null,person.acted?"Acted":"—");
          actor.title=person.acted
            ?"Recorded as acting in this occurrence; not proof of every later effect."
            :"No recorded actor attribution; not a claim of no influence.";
          row.append(actor);
          const noticed=el("td",null,person.attention==="noticed"?"Yes":
            person.attention==="not_noticed"?"No":"—");
          noticed.title=person.attention==="noticed"?"Independently recorded attention.":
            person.attention==="not_noticed"?"Explicitly recorded not noticing.":
              "No appraisal recorded; not proof of missing perception.";
          row.append(noticed);
          const memory=el("td");
          if(person.memoryLinks.length){
            for(const [index,memoryId] of person.memoryLinks.entries()){
              const link=el("a","world-events-memory-link",
                person.memoryLinks.length===1?"Retained":String(index+1));
              link.href="/life?thread="+encodeURIComponent(person.threadId)
                +"&memory="+encodeURIComponent(memoryId);
              link.title="Open current autobiographical Memory "+memoryId;
              memory.append(link);
            }
          }else{
            memory.textContent="—";
            memory.title="No current linked Memory in this bounded view; not proof of forgetting.";
          }
          row.append(memory);
          const change=el("td",null,person.impactLink?"Linked":"Unproven");
          change.title=person.impactLink
            ?"Downstream evidence reference recorded; inspect event JSON and personal history."
            :"No attributable later behavioral change is linked by this projection.";
          row.append(change);
          body.append(row);
        }
        table.append(thead,body);scroller.append(table);card.append(scroller);
      }else{
        card.append(el("p","world-events-evidence-note",
          "No Thread actor or independently recorded observer in this bounded event. The World occurrence remains real."));
      }
      card.append(el("p","world-events-evidence-note",
        "— means no recorded evidence, not no participation or forgetting. Memory is current retention; only an independently linked later effect establishes behavioral change."));
      return card;
  }
  function drawUnlocated(){
    unlocatedTimeline.replaceChildren();
    const events=snapshot?.unmappedEvents??[];
    unlocatedCount.textContent=snapshot
      ?`${events.length} unmapped · ${windowText(snapshot)}`:"No data";
    if(!events.length){
      unlocatedTimeline.append(el("p","world-events-muted",
        "No unmapped stories in this bounded window."));
      return;
    }
    for(const event of events)unlocatedTimeline.append(worldEventCard(event));
  }
  function drawCoPresence(){
    const result=worldVenueCoPresence(snapshot,selectedPlace);
    const zone=snapshot?.places.find(site=>site.placeRef===selectedPlace)?.timeZone??null;
    if(!result.stays.length)return;
    const sectionHead=el("div","world-events-presence-head");
    sectionHead.append(el("h3",null,"Shared presence"),
      el("span",null,`${result.stays.length} complete stays · ${result.overlaps.length} confirmed overlaps · ${zone??"UTC (venue zone unavailable)"}`));
    presence.append(sectionHead);
    const from=Math.min(...result.stays.map(stay=>Date.parse(stay.enteredAt)));
    const until=Math.max(...result.stays.map(stay=>Date.parse(stay.leftAt)));
    const duration=Math.max(1,until-from);
    const lanes=el("div","world-events-presence-lanes");
    for(const stay of result.stays.slice(0,12)){
      const line=el("div","world-events-presence-lane");
      const person=el("div","world-events-presence-person");
      person.append(createThreadIdentityViewer({
        threadId:stay.threadId,compact:true,className:"world-events-person",
      }));
      const life=el("a",null,"Life & Causes ↗");
      life.href="/life?thread="+encodeURIComponent(stay.threadId)+"&view=history"
        +"&moment="+encodeURIComponent("scene:"+stay.arrivalRef);
      person.append(life);
      const track=el("div","world-events-presence-track");
      const bar=el("span","world-events-presence-bar");
      bar.style.left=((Date.parse(stay.enteredAt)-from)/duration*100).toFixed(2)+"%";
      bar.style.width=((Date.parse(stay.leftAt)-Date.parse(stay.enteredAt))/duration*100).toFixed(2)+"%";
      bar.title=`Enacted stay · ${formatWorldEventTime(stay.enteredAt,zone)} – ${formatWorldEventTime(stay.leftAt,zone)}`;
      track.append(bar);
      const interval=el("span","world-events-presence-time",
        `${formatWorldEventTime(stay.enteredAt,zone,{clockOnly:true})}–${formatWorldEventTime(stay.leftAt,zone,{clockOnly:true})}`);
      line.append(person,track,interval);
      lanes.append(line);
    }
    presence.append(lanes);
    if(result.stays.length>12)presence.append(el("p","world-events-evidence-note",
      "Showing first 12 complete stays in this bounded view."));
    if(result.overlaps.length){
      const overlaps=el("div","world-events-presence-overlaps");
      for(const overlap of result.overlaps.slice(0,5)){
        const entry=el("div","world-events-presence-overlap");
        const people=el("div","world-events-presence-overlap-people");
        for(const threadId of overlap.threadIds){
          people.append(createThreadIdentityViewer({
            threadId,compact:true,className:"world-events-person",
          }));
        }
        const minutes=Math.round(overlap.durationMinutes);
        entry.append(el("strong",null,`Together · ${minutes} min`),
          people,el("span",null,
            `${formatWorldEventTime(overlap.from,zone)} – ${formatWorldEventTime(overlap.until,zone)}`));
        overlaps.append(entry);
      }
      presence.append(overlaps);
    }
    const limits=["Complete arrival/departure pairs only; presence is not attention or conversation."];
    if(result.unmatchedMovements)limits.push(
      `${result.unmatchedMovements} unpaired movement(s) excluded.`);
    if(result.sourceCapped)limits.push("World source capped; additional stays may be missing.");
    if(result.additionalOverlaps||result.overlaps.length>5){
      limits.push("Only the first overlapping intervals are displayed.");
    }
    presence.append(el("p","world-events-evidence-note",limits.join(" ")));
  }
  function drawTimeline(){
    timeline.replaceChildren();
    presence.replaceChildren();
    const selected=snapshot?.places.find(p=>p.placeRef===selectedPlace);
    timelineTitle.textContent=selected?.name??"World timeline";
    placeDayCopy.disabled=!selected;
    placeDayCopy.hidden=!selected;
    placeDayHint.hidden=!selected;
    const events=worldEventPlaceTimeline(snapshot,selectedPlace);
    timelineCount.textContent=snapshot
      ?`${events.length} shown · ${windowText(snapshot)}`:"No data";
    timelineCount.title=snapshot?formatWorldTimeRange(snapshot,selected?.timeZone??null):"";
    if(!selected){
      timeline.append(el("p","world-events-muted","Choose a place to inspect its World history."));
      return;
    }
    drawCoPresence();
    if(!events.length){
      timeline.append(el("p","world-events-muted",
        "No admitted event in the bounded window. This does not mean nothing happened here."));
      return;
    }
    for(const event of events)timeline.append(worldEventCard(event));
  }
  async function load(){
    if(loading)return;
    loading=true;refresh.disabled=true;refresh.textContent="Reading World…";
    summary.textContent="Inspecting authoritative World history…";
    try{
      const response=await fetch(`/api/world-events?hours=${encodeURIComponent(hours.value)}`,{
        headers:{Accept:"application/json"},cache:"no-store",
      });
      const payload=await response.json();
      if(!response.ok)throw Error(payload?.detail??payload?.error??`HTTP ${response.status}`);
      if(payload.contract!=="fibre-world-event-observatory-v0.1")throw Error("World event contract mismatch");
      snapshot=payload;
      const truncated=bounded(payload);
      summary.textContent=`${payload.events.length} located events · ${(payload.unmappedEvents??[]).length} unmapped stories · ${activeWorldEventCities(payload).length} active cities · ${payload.places.length} verified places · last ${payload.hours} hours${truncated?" · bounded source sample":""}`;
      chooseCity(payload.cities.some(city=>city.key===selectedCity)?selectedCity:
        (activeWorldEventCities(payload)[0]??payload.cities[0])?.key??null);
      drawUnlocated();
      $("#environment-pill").textContent="World";
    }catch(error){
      summary.textContent=`World event evidence unavailable · ${error.message}`;
      snapshot=null;selectedCity=null;selectedPlace=null;
      drawWorldMap();drawPlaces();drawTimeline();drawUnlocated();
    }finally{
      loading=false;refresh.disabled=false;refresh.textContent="Refresh";
    }
  }
  refresh.addEventListener("click",()=>void load());
  hours.addEventListener("change",()=>void load());
  void load();
}
