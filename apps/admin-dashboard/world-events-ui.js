import {mountWorldMap,worldMapPoint,SVG_NS} from "./world-map-ui.js";

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
const labelTime=value=>value?new Date(value).toLocaleString(undefined,{
  month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",
}):"Unknown time";
const pretty=value=>String(value??"").replaceAll("_"," ").replace(/\b\w/gu,c=>c.toUpperCase());

export function worldEventPlaceTimeline(snapshot,placeRef){
  return (snapshot?.events??[])
    .filter(event=>event.placeRef===placeRef)
    .sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt))
      ||String(a.eventRef).localeCompare(String(b.eventRef)));
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
  actions.append(hoursLabel,refresh);
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
  timelineHead.append(timelineTitle,timelineCount);
  const timeline=el("div","world-events-timeline");
  timelinePanel.append(timelineHead,timeline);
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
      ?`${city.eventCount} admitted events in ${city.placeCount} verified places · selected window`
      :"Select a city to explore places.";
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
          `${city.name}, ${city.country}: ${city.eventCount} observed events`,
      });
      marker.classList.add("world-events-city-marker");
      if(city.eventCount>0)marker.classList.add("is-pulsing");
      if(city.key===selectedCity)marker.classList.add("is-selected");
      if(city.eventCount>0){
        marker.append(svgNode("circle",{r:13,class:"world-events-pulse"}));
      }
      marker.append(svgNode("circle",{r:city.key===selectedCity?8:6,class:"world-events-dot"}));
      const caption=svgNode("text",{x:12,y:4,class:"world-events-city-label"});
      caption.textContent=city.name;
      marker.append(caption);
      const title=svgNode("title");
      title.textContent=`${city.name}: ${city.eventCount} recent admitted events`;
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
    cityDescription.textContent=
      "Relative positions use verified venue coordinates. This is a geographic place view, not a street map.";
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
    const width=720,height=320;
    const latitudes=sites.map(p=>p.lat),longitudes=sites.map(p=>p.long);
    const loLat=Math.min(...latitudes),hiLat=Math.max(...latitudes);
    const loLon=Math.min(...longitudes),hiLon=Math.max(...longitudes);
    const spanLat=Math.max(0.008,(hiLat-loLat)*1.5);
    const spanLon=Math.max(0.008,(hiLon-loLon)*1.5);
    const centerLat=(loLat+hiLat)/2,centerLon=(loLon+hiLon)/2;
    const svg=svgNode("svg",{viewBox:`0 0 ${width} ${height}`,
      preserveAspectRatio:"xMidYMid meet",
      "aria-label":`Verified places in ${sites[0].city}`,role:"img"});
    svg.classList.add("world-events-city-svg");
    for(let i=1;i<5;i++){
      svg.append(svgNode("line",{x1:width*i/5,y1:0,x2:width*i/5,y2:height,
        class:"world-events-grid-line"}));
      svg.append(svgNode("line",{x1:0,y1:height*i/5,x2:width,y2:height*i/5,
        class:"world-events-grid-line"}));
    }
    for(const site of sites){
      const x=width/2+(site.long-centerLon)/spanLon*(width-92);
      const y=height/2-(site.lat-centerLat)/spanLat*(height-76);
      const marker=svgNode("g",{transform:`translate(${x.toFixed(1)} ${y.toFixed(1)})`,
        tabindex:0,role:"button","aria-label":site.name});
      marker.classList.add("world-events-place-marker");
      if(site.eventCount>0)marker.classList.add("is-pulsing");
      if(site.placeRef===selectedPlace)marker.classList.add("is-selected");
      if(site.eventCount>0)marker.append(svgNode("circle",{
        r:17,class:"world-events-pulse",
      }));
      marker.append(svgNode("circle",{r:site.placeRef===selectedPlace?10:7,
        class:"world-events-dot"}));
      const title=svgNode("title");title.textContent=site.name;marker.append(title);
      marker.addEventListener("click",()=>choosePlace(site.placeRef));
      marker.addEventListener("keydown",event=>{
        if(event.key==="Enter"||event.key===" "){
          event.preventDefault();choosePlace(site.placeRef);
        }
      });
      svg.append(marker);
    }
    cityMap.append(svg);
    for(const site of sites){
      const button=el("button","world-events-place-choice");
      button.type="button";
      if(site.placeRef===selectedPlace)button.classList.add("is-selected");
      const name=el("strong",null,site.name);
      const detail=el("span",null,`${site.eventCount} event${site.eventCount===1?"":"s"} · ${site.latestEventAt?labelTime(site.latestEventAt):"no recent event"}`);
      button.append(name,detail);
      button.addEventListener("click",()=>choosePlace(site.placeRef));
      places.append(button);
    }
  }
  function worldEventCard(event){
      const card=el("article","world-events-event-card");
      const head=el("div","world-events-event-head");
      head.append(el("span","world-events-event-kind",pretty(event.kind)),
        el("time",null,labelTime(event.occurredAt)));
      const summary=el("p","world-events-event-summary",event.summary||"Admitted World event");
      const ref=el("div","world-events-event-ref",event.eventRef);
      card.append(head,summary,ref);
      if(event.actorThreadId){
        const actor=el("p","world-events-actor");
        actor.append(el("span",null,"Actor · "));
        const link=el("a",null,event.actorThreadId);
        link.href=`/thread/${encodeURIComponent(event.actorThreadId)}`;
        actor.append(link);card.append(actor);
      }
      if(event.witnesses?.length){
        const witnessHeading=el("h3",null,"Perception and consequences");
        const rows=el("div","world-events-witnesses");
        for(const witness of event.witnesses){
          const row=el("div","world-events-witness");
          const link=el("a",null,witness.threadId);
          link.href=`/thread/${encodeURIComponent(witness.threadId)}`;
          const attention=el("span","world-events-attention",
            witness.attention==="not_appraised"?"No attention record":
              witness.attention==="noticed"?"Noticed":"Did not notice");
          row.append(link,attention);
          if(event.source==="encounter_story"){
            const inspect=el("a",null,"Life & Causes ↗");
            inspect.href="/life?thread="+encodeURIComponent(witness.threadId)
              +"&view=history&moment="+encodeURIComponent(
                (event.kind==="encounter"?"encounter:":"world:")+event.eventRef);
            inspect.title="Inspect this person's evidence and perspective; a shared Story does not imply shared motives.";
            row.append(inspect);
          }
          if(witness.experienceId){
            const experience=el("span",null,`Experience · ${witness.experienceId}`);
            experience.title="Admitted personal Experience; not proof of later behavior.";
            row.append(experience);
          }
          for(const memoryId of witness.memoryLinks??(witness.memoryLink?[witness.memoryLink]:[])){
            const memory=el("a",null,"View retained Memory ↗");
            memory.href=`/life?thread=${encodeURIComponent(witness.threadId)}&memory=${encodeURIComponent(memoryId)}`;
            memory.title="A current autobiographical Memory explicitly linked through experience consolidation.";
            row.append(memory);
          }
          rows.append(row);
        }
        card.append(witnessHeading,rows);
      }
      const caveat=el("p","world-events-evidence-note",
        "Memory links appear only when consolidation created a current Memory. Later behavioral impact is not yet causally linked in this view.");
      card.append(caveat);
      return card;
  }
  function drawUnlocated(){
    unlocatedTimeline.replaceChildren();
    const events=snapshot?.unmappedEvents??[];
    unlocatedCount.textContent=`${events.length} admitted, not mapped`;
    if(!events.length){
      unlocatedTimeline.append(el("p","world-events-muted",
        "No unmapped stories in this bounded window."));
      return;
    }
    for(const event of events)unlocatedTimeline.append(worldEventCard(event));
  }
  function drawTimeline(){
    timeline.replaceChildren();
    const selected=snapshot?.places.find(p=>p.placeRef===selectedPlace);
    timelineTitle.textContent=selected?.name??"World timeline";
    const events=worldEventPlaceTimeline(snapshot,selectedPlace);
    timelineCount.textContent=`${events.length} admitted event${events.length===1?"":"s"}`;
    if(!selected){
      timeline.append(el("p","world-events-muted","Choose a place to inspect its World history."));
      return;
    }
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
      const truncated=Object.entries(payload.coverage??{}).some(([k,v])=>k.endsWith("Truncated")&&v);
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
