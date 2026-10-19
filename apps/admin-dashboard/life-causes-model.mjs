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
          decisionContext:plan.cognition?.decisionContext??null,
          selectedEvidenceRefs:plan.cognition?.selectedEvidenceRefs??[],
        }),
      });
    }));
}


// This view is intentionally bounded by the World Observatory's returned
// history, not presented as a complete lifetime record.
export function recordedLifeMoments({
  livedNow=null,memories=[],encounterStories=[],socialOpportunities=[],
  socialInteractions=[],threadId=null,
}={}){
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
      .find(candidate=>candidate&&(candidate.kind===undefined||candidate.kind==="personal"))??null;
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
        decisionContext:plan.cognition?.decisionContext??null,
        selectedEvidenceRefs:plan.cognition?.selectedEvidenceRefs??[],
      }):null,
    }));
  }
  const decisions=(Array.isArray(socialOpportunities)?socialOpportunities:[])
    .flatMap(item=>{
      if(!item?.completedAt||!Number.isFinite(Date.parse(item.completedAt)))return [];
      return [Object.freeze({
        kind:"social_choice",
        id:item.kind+":"+item.situationId+":"+(item.sourceEncounterRef??"arrival"),
        at:item.completedAt,
        title:item.outcome==="met"?"A conversation began"
          :item.outcome==="not_initiated"?"Chose not to approach"
          :item.outcome==="background"?"Social opportunity stayed in the background"
          :item.outcome==="not_met"?"Conversation was not accepted"
          :"Social consideration · "+item.outcome,
        outcome:item.outcome,situationId:item.situationId,
        decision:item.decision??null,
        sourceEncounterRef:item.sourceEncounterRef??null,
      })];
    });
  const byStory=new Map(decisions.filter(item=>item.decision?.encounterRef)
    .map(item=>[item.decision.encounterRef,item.decision]));
  const responses=(Array.isArray(socialInteractions)?socialInteractions:[])
    .flatMap(interaction=>{
      if(typeof interaction?.interactionId!=="string"
        ||!Number.isFinite(Date.parse(interaction.occurredAt??""))
        ||(threadId!==null&&![interaction.initiatorThreadId,
          interaction.recipientThreadId].includes(threadId)))return [];
      return [Object.freeze({
        kind:"social_interaction",id:interaction.interactionId,
        at:interaction.occurredAt,
        title:interaction.responseDecision==="accept"?"Accepted a social invitation"
          :interaction.responseDecision==="decline"?"Declined a social invitation"
          :"Deferred a social invitation",
        role:threadId===interaction.recipientThreadId?"recipient":"initiator",
        initiatorThreadId:interaction.initiatorThreadId,
        recipientThreadId:interaction.recipientThreadId,
        requestText:interaction.requestText,
        responseDecision:interaction.responseDecision,
        responseExpression:interaction.responseExpression,
        suggestedAt:interaction.suggestedAt,
      })];
    });
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
    const memoryLinks=(Array.isArray(memories)?memories:[]).filter(
      memory=>typeof experienced?.experienceId==="string"
        &&(memory.eventRefs??[]).includes(experienced.experienceId),
    ).map(memory=>memory.memoryId).filter(Boolean);
    episodes.set(story.encounterId,Object.freeze({
      kind:social?"encounter":"world",
      id:story.encounterId,at:story.occurredAt,
      title:first?.text??(social?"Social encounter":"World occurrence"),
      attention:story.attention?.outcome??null,
      experienceText:experienced?.experienceText??null,
      experienceId:experienced?.experienceId??null,
      memoryLinks:Object.freeze(memoryLinks),
      socialDecision:byStory.get(story.encounterId)??null,
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
  const all=[...sceneById.values(),...episodes.values(),...decisions,...responses,...recalled];
  const ordered=all.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)
    ||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  return Object.freeze(ordered);
}


// Birth date is an identity fact, not a World occurrence or a Genesis
// compiler timestamp. Retained memories are individual perspectives,
// never a substitute for the child's full admitted historical episodes.
export function formativeLifeMoments({
  identity={},memories=[],genesisEpisodes=[],publicationAt=null,
}={}){
  const birthDate=identity.birthDate??identity.world?.thread?.identity?.birthDate??null;
  const place=identity.birthPlace??identity.world?.thread?.identity?.birthCity??null;
  const origin=Number.isFinite(Date.parse(birthDate??""))?[Object.freeze({
    kind:"origin",id:"origin:"+birthDate,at:birthDate,
    title:place?"Born in "+place:"Recorded birth date",
    birthDate,birthPlace:place,
  })]:[];
  const published=Date.parse(publicationAt??"");
  const remembered=recordedLifeMoments({memories})
    .filter(moment=>moment.kind==="memory"
      &&Number.isFinite(published)&&Date.parse(moment.at)<published);
  // These are dated subject Memories, not all Genesis events and not a
  // proof of which life stage produced them.
  const admitted=(Array.isArray(genesisEpisodes)?genesisEpisodes:[]).flatMap(event=>{
    if(typeof event?.eventId!=="string"
      ||!Number.isFinite(Date.parse(event?.occurredAt??"")))return [];
    return [Object.freeze({
      kind:"formative_event",id:event.eventId,at:event.occurredAt,
      title:event.observableAction??"Admitted childhood episode",
      ageAtEvent:event.ageAtEvent??null,
      episodeId:event.episodeId??null,
      genesisId:event.genesisId??null,
      placeRef:event.placeRef??null,
      participantRefs:event.participantRefs??[],
    })];
  });
  return Object.freeze([...origin,...admitted,...remembered].sort(
    (a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.kind.localeCompare(b.kind),
  ));
}
