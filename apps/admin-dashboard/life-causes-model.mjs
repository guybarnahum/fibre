// Semantic recent-life projection: an admitted situation is World fact;
// a linked Flight Plan is intention, never proof of motive or encounter.
export function recentLifeMoments(livedNow){
  const current=livedNow?.currentSituation??null;
  const scenes=Array.isArray(livedNow?.recentSituations)
    ?livedNow.recentSituations:[];
  const byId=new Map();
  for(const situation of [current,...scenes]){
    if(typeof situation?.situationId!=="string")continue;
    if(!Number.isFinite(Date.parse(situation.establishedAt??"")))continue;
    if(!byId.has(situation.situationId))byId.set(situation.situationId,situation);
  }
  const plan=livedNow?.currentPersonalPlan??null;
  return Object.freeze([...byId.values()]
    .sort((a,b)=>Date.parse(b.establishedAt)-Date.parse(a.establishedAt))
    .slice(0,8).map(situation=>{
      const at=Date.parse(situation.establishedAt);
      const actualPlaceRef=situation.location?.kind==="place"
        ?situation.location.placeRef:null;
      const planLinked=typeof plan?.planId==="string"
        &&(situation.sourcePlanRefs??[]).includes(plan.planId);
      const stop=planLinked?(plan.stops??[]).find(item=>
        item.physicalPlaceRef===actualPlaceRef
        &&Date.parse(item.startAt)<=at&&at<Date.parse(item.endAt)
      )??null:null;
      return Object.freeze({
        kind:"scene",id:situation.situationId,at:situation.establishedAt,
        phase:situation.phase??null,activity:situation.activity??null,
        placeRef:actualPlaceRef,
        placeKind:actualPlaceRef?.startsWith("wpl_")?"verified_public"
          :actualPlaceRef===null?"unspecified":"private_or_unverified",
        publicVenueName:actualPlaceRef?.startsWith("wpl_")
          &&situation.situationId===current?.situationId
          &&livedNow?.currentLocation?.placeRef===actualPlaceRef
          ?livedNow.currentLocation.displayName??null:null,
        planned:stop===null?null:Object.freeze({
          planId:plan.planId,authoredAt:plan.authoredAt,
          activity:stop.activity??null,purpose:stop.purpose??null,
        }),
      });
    }));
}


// This view is intentionally bounded by the World Observatory's returned
// history, not presented as a complete lifetime record.
export function recordedLifeMoments({livedNow=null,memories=[],encounterStories=[]}={}){
  const planById=new Map([
    ...(livedNow?.recentPersonalPlans??[]),
    ...(livedNow?.currentPersonalPlan?[livedNow.currentPersonalPlan]:[]),
  ].filter(plan=>typeof plan?.planId==="string").map(plan=>[plan.planId,plan]));
  const sceneById=new Map();
  for(const situation of [livedNow?.currentSituation,...(livedNow?.recentSituations??[])]){
    if(typeof situation?.situationId!=="string"
      ||!Number.isFinite(Date.parse(situation.establishedAt??"")))continue;
    if(sceneById.has(situation.situationId))continue;
    const actualPlaceRef=situation.location?.kind==="place"?situation.location.placeRef:null;
    const plan=(situation.sourcePlanRefs??[]).map(ref=>planById.get(ref))
      .find(candidate=>candidate?.kind==="personal")??null;
    const at=Date.parse(situation.establishedAt);
    const stop=plan?.stops?.find(item=>item.physicalPlaceRef===actualPlaceRef
      &&Date.parse(item.startAt)<=at&&at<Date.parse(item.endAt))??null;
    sceneById.set(situation.situationId,Object.freeze({
      kind:"scene",id:situation.situationId,at:situation.establishedAt,
      title:situation.activity??(situation.phase==="in_transit"?"Travel":"Enacted situation"),
      activity:situation.activity??null,phase:situation.phase??null,
      placeRef:actualPlaceRef,
      placeKind:actualPlaceRef?.startsWith("wpl_")?"world_place"
        :actualPlaceRef===null?"unspecified":"private_or_unverified",
      planned:stop&&plan?Object.freeze({
        planId:plan.planId,authoredAt:plan.authoredAt,
        activity:stop.activity??null,purpose:stop.purpose??null,
      }):null,
    }));
  }
  const episodes=new Map();
  for(const story of encounterStories){
    if(typeof story?.encounterId!=="string"
      ||!Number.isFinite(Date.parse(story.occurredAt??"")))continue;
    // Story continuations can be inspected as individual admitted events;
    // never infer a new meeting from proximity or a planned destination.
    const beats=story.story?.beats??[];
    const social=beats.some(beat=>["utterance","action"].includes(beat.kind));
    const occurrence=beats.find(beat=>beat.kind==="occurrence");
    const first=beats.find(beat=>typeof beat.text==="string"&&beat.text.trim())??null;
    const experienced=story.attention?.experience??null;
    episodes.set(story.encounterId,Object.freeze({
      kind:social?"encounter":"world",
      id:story.encounterId,at:story.occurredAt,
      title:first?.text??(social?"Social encounter":"World occurrence"),
      attention:story.attention?.outcome??null,
      experienceText:experienced?.experienceText??null,
      experienceId:experienced?.experienceId??null,
      sceneId:story.situation?.situationId??null,
      occurrenceText:occurrence?.text??null,
      dialogue:beats.filter(beat=>["utterance","action"].includes(beat.kind))
        .slice(0,12).map(beat=>Object.freeze({
          speaker:beat.actorThreadId??"Visitor",text:beat.text??"",
        })),
    }));
  }
  const recalled=(Array.isArray(memories)?memories:[]).flatMap(memory=>{
    if(typeof memory?.memoryId!=="string")return [];
    const at=memory.subjectPeriod?.startAt??memory.subjectPeriod?.endAt??memory.recordedAt;
    if(!Number.isFinite(Date.parse(at??"")))return [];
    return [Object.freeze({
      kind:"memory",id:memory.memoryId,at,
      title:memory.rememberedContent??"Autobiographical Memory",
      meaning:memory.rememberedMeaning??null,
      eventRefs:Array.isArray(memory.eventRefs)?memory.eventRefs:[],
      recordedAt:memory.recordedAt??null,
    })];
  });
  const all=[...sceneById.values(),...episodes.values(),...recalled];
  const ordered=all.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)
    ||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  return Object.freeze(ordered);
}
