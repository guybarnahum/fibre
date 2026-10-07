function continuationRoot(storyById, encounterId) {
  let current=encounterId;
  const seen=new Set();
  while(!seen.has(current)){
    seen.add(current);
    const story=storyById.get(current);
    const parent=story?.story?.continuationOfEncounterRef??null;
    if(typeof parent!=="string"||!storyById.has(parent))return current;
    current=parent;
  }
  return encounterId;
}

function hasAnyRef(values,refs){
  return (Array.isArray(values)?values:[]).some((value)=>refs.has(value));
}

export function buildEncounterEpisodes({
  encounterStories=[],
  experienceConsolidation=null,
  experienceJournalEntries=[],
  memories=[],
  semanticStates=[],
  lifeRelations=[],
}={}){
  const stories=(Array.isArray(encounterStories)?encounterStories:[])
    .map((story)=>structuredClone(story));
  const storyById=new Map(stories.map((story)=>[story.encounterId,story]));
  const groups=new Map();

  for(const story of stories){
    const root=continuationRoot(storyById,story.encounterId);
    if(!groups.has(root))groups.set(root,[]);
    groups.get(root).push(story);
  }

  const queued=Array.isArray(experienceConsolidation?.queued)
    ?experienceConsolidation.queued:[];
  const consolidations=Array.isArray(experienceConsolidation?.consolidations)
    ?experienceConsolidation.consolidations:[];
  const legacyJournal=Array.isArray(experienceJournalEntries)
    ?experienceJournalEntries:[];
  const memoryRecords=Array.isArray(memories)?memories:[];

  return Object.freeze([...groups.entries()].map(([episodeId,episodeStories])=>{
    const ordered=[...episodeStories].sort((left,right)=>
      Date.parse(left.occurredAt)-Date.parse(right.occurredAt)
      ||String(left.encounterId).localeCompare(String(right.encounterId)));
    const experiences=ordered
      .map((story)=>story.attention?.experience??null)
      .filter(Boolean);
    const experienceRefs=new Set(experiences.map((item)=>item.experienceId));
    const linkedConsolidations=consolidations.filter((item)=>
      hasAnyRef(item.experienceRefs,experienceRefs));
    const queuedRefs=queued.filter((item)=>experienceRefs.has(item.experienceId));
    const journals=[
      ...legacyJournal.filter((entry)=>experienceRefs.has(entry.aboutExperienceRef)),
      ...linkedConsolidations.map((item)=>item.journal).filter(Boolean),
    ];
    const linkedMemories=memoryRecords.filter((memory)=>hasAnyRef(memory.eventRefs,experienceRefs));
    const causalRefs=new Set([
      ...experienceRefs,
      ...ordered.map((story)=>story.encounterId),
      ...linkedConsolidations.map((item)=>item.consolidationId),
      ...linkedMemories.map((memory)=>memory.memoryId),
    ]);
    const linkedSemanticStates=(Array.isArray(semanticStates)?semanticStates:[]).filter((state)=>
      hasAnyRef(state.evidenceRefs??state.sourceReferences,causalRefs));
    const linkedLifeRelations=(Array.isArray(lifeRelations)?lifeRelations:[]).filter((relation)=>
      hasAnyRef(relation.sourceReferences,causalRefs));
    const afterthoughts=linkedConsolidations.flatMap((item)=>
      Array.isArray(item.decision?.payload?.afterthoughts)
        ?item.decision.payload.afterthoughts.map((thought)=>({
            consolidationId:item.consolidationId,
            ...structuredClone(thought),
          }))
        :[]);

    const hasIncomplete=linkedConsolidations.some((item)=>item.complete===null);
    const consolidationStatus=hasIncomplete
      ?"consolidating"
      :queuedRefs.length>0
        ?"pending"
        :linkedConsolidations.length>0
          ?"complete"
          :experiences.length>0
            ?"unqueued"
            :"none";

    return Object.freeze({
      episodeId,
      startedAt:ordered[0]?.occurredAt??null,
      endedAt:ordered.at(-1)?.occurredAt??null,
      stories:Object.freeze(ordered),
      experiences:Object.freeze(experiences.map((item)=>structuredClone(item))),
      consolidation:Object.freeze({
        status:consolidationStatus,
        queued:Object.freeze(queuedRefs.map((item)=>structuredClone(item))),
        records:Object.freeze(linkedConsolidations.map((item)=>structuredClone(item))),
      }),
      journals:Object.freeze(journals.map((item)=>structuredClone(item))),
      memories:Object.freeze(linkedMemories.map((item)=>structuredClone(item))),
      semanticStates:Object.freeze(linkedSemanticStates.map((item)=>structuredClone(item))),
      lifeRelations:Object.freeze(linkedLifeRelations.map((item)=>structuredClone(item))),
      afterthoughts:Object.freeze(afterthoughts),
    });
  }).sort((left,right)=>Date.parse(right.startedAt)-Date.parse(left.startedAt)));
}

function socialEpisodeProfile(episode,threadId){
  const counterparties=new Set();
  const socialBeats=[];
  let anonymousVisitor=false;

  for(const story of episode.stories){
    for(const presence of story.threadPresence??[]){
      if(presence.threadId!==threadId)counterparties.add(presence.threadId);
    }
    for(const beat of story.story?.beats??[]){
      if(!["utterance","action"].includes(beat.kind))continue;
      socialBeats.push(beat);
      if(beat.actorThreadId===null)anonymousVisitor=true;
      else if(beat.actorThreadId!==threadId)counterparties.add(beat.actorThreadId);
    }
  }

  const social=counterparties.size>0||anonymousVisitor;
  const firstActor=socialBeats[0]?.actorThreadId??null;
  const openedByThread=social&&firstActor===threadId;
  const openedExternally=social&&!openedByThread;
  const responded=openedExternally&&socialBeats.slice(1).some((beat)=>beat.actorThreadId===threadId);

  return Object.freeze({
    episode,
    social,
    counterparties:Object.freeze([...counterparties]),
    anonymousVisitor,
    openedByThread,
    openedExternally,
    responded,
  });
}

function includesWindow(value,startMs,endMs){
  const time=Date.parse(value??"");
  return Number.isFinite(time)&&time>=startMs&&time<=endMs;
}

export function buildSocialAnalytics({
  threadId,
  encounterStories=[],
  socialInteractions=[],
  experienceConsolidation=null,
  experienceJournalEntries=[],
  memories=[],
  semanticStates=[],
  lifeRelations=[],
  asOf=new Date().toISOString(),
  windowDays=30,
}={}){
  if(typeof threadId!=="string"||threadId.trim()===""){
    throw new TypeError("social analytics requires threadId");
  }
  if(!Number.isSafeInteger(windowDays)||windowDays<1||windowDays>3650){
    throw new TypeError("social analytics windowDays must be 1-3650");
  }
  const endMs=Date.parse(asOf);
  if(!Number.isFinite(endMs))throw new TypeError("social analytics asOf must be an ISO timestamp");
  const startMs=endMs-windowDays*24*60*60*1000;

  const episodes=buildEncounterEpisodes({
    encounterStories,
    experienceConsolidation,
    experienceJournalEntries,
    memories,
    semanticStates,
    lifeRelations,
  }).filter((episode)=>includesWindow(episode.startedAt,startMs,endMs))
    .map((episode)=>socialEpisodeProfile(episode,threadId))
    .filter((profile)=>profile.social);

  const interactions=(Array.isArray(socialInteractions)?socialInteractions:[])
    .filter((record)=>includesWindow(record.occurredAt,startMs,endMs));

  const knownCounterparties=new Set();
  const episodeCountByCounterparty=new Map();
  for(const profile of episodes){
    for(const counterparty of profile.counterparties){
      knownCounterparties.add(counterparty);
      episodeCountByCounterparty.set(
        counterparty,
        (episodeCountByCounterparty.get(counterparty)??0)+1,
      );
    }
  }

  const directionByCounterparty=new Map();
  for(const interaction of interactions){
    const outgoing=interaction.initiatorThreadId===threadId;
    const incoming=interaction.recipientThreadId===threadId;
    if(!outgoing&&!incoming)continue;
    const counterparty=outgoing?interaction.recipientThreadId:interaction.initiatorThreadId;
    knownCounterparties.add(counterparty);
    const direction=directionByCounterparty.get(counterparty)??{outgoing:false,incoming:false};
    if(outgoing)direction.outgoing=true;
    if(incoming)direction.incoming=true;
    directionByCounterparty.set(counterparty,direction);
  }

  const outgoing=interactions.filter((record)=>record.initiatorThreadId===threadId);
  const incoming=interactions.filter((record)=>record.recipientThreadId===threadId);
  const responseDecision=(decision)=>incoming.filter((record)=>record.responseDecision===decision).length;
  const reciprocal=[...directionByCounterparty.values()].filter((direction)=>
    direction.outgoing&&direction.incoming).length;
  const recurring=[...episodeCountByCounterparty.values()].filter((count)=>count>=2).length;
  const continued=episodes.filter((profile)=>profile.episode.stories.length>1);
  const consequenceEpisodes=episodes.filter(({episode})=>
    episode.journals.length>0
    ||episode.memories.length>0
    ||episode.afterthoughts.length>0
    ||episode.semanticStates.length>0
    ||episode.lifeRelations.length>0);

  return Object.freeze({
    windowDays,
    startAt:new Date(startMs).toISOString(),
    endAt:new Date(endMs).toISOString(),
    exposure:Object.freeze({
      episodes:episodes.length,
      noticedEpisodes:episodes.filter(({episode})=>episode.experiences.length>0).length,
      anonymousVisitorEpisodes:episodes.filter(({anonymousVisitor})=>anonymousVisitor).length,
    }),
    initiative:Object.freeze({
      openedEpisodes:episodes.filter(({openedByThread})=>openedByThread).length,
      outgoingOvertures:outgoing.length,
    }),
    responsiveness:Object.freeze({
      externallyOpenedEpisodes:episodes.filter(({openedExternally})=>openedExternally).length,
      answeredEpisodes:episodes.filter(({responded})=>responded).length,
      incomingOvertures:incoming.length,
      accepted:responseDecision("accept"),
      declined:responseDecision("decline"),
      deferred:responseDecision("defer"),
    }),
    breadth:Object.freeze({
      knownCounterparties:knownCounterparties.size,
      anonymousVisitorEpisodes:episodes.filter(({anonymousVisitor})=>anonymousVisitor).length,
    }),
    reciprocity:Object.freeze({
      bidirectionalCounterparties:reciprocal,
      directionalCounterparties:directionByCounterparty.size,
    }),
    depth:Object.freeze({
      continuedEpisodes:continued.length,
      maxStoryCount:episodes.reduce((max,{episode})=>Math.max(max,episode.stories.length),0),
    }),
    continuity:Object.freeze({
      recurringCounterparties:recurring,
      knownCounterpartiesWithEpisodes:episodeCountByCounterparty.size,
    }),
    consequence:Object.freeze({
      episodes:consequenceEpisodes.length,
      journalEpisodes:episodes.filter(({episode})=>episode.journals.length>0).length,
      memoryEpisodes:episodes.filter(({episode})=>episode.memories.length>0).length,
      afterthoughtEpisodes:episodes.filter(({episode})=>episode.afterthoughts.length>0).length,
      semanticEpisodes:episodes.filter(({episode})=>episode.semanticStates.length>0).length,
      relationshipEpisodes:episodes.filter(({episode})=>episode.lifeRelations.length>0).length,
    }),
  });
}
