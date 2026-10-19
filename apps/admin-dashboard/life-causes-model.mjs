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
        id:situation.situationId,at:situation.establishedAt,
        phase:situation.phase??null,activity:situation.activity??null,
        placeRef:actualPlaceRef,
        placeKind:actualPlaceRef?.startsWith("wpl_")?"verified_public"
          :actualPlaceRef===null?"unspecified":"private_or_unverified",
        planned:stop===null?null:Object.freeze({
          planId:plan.planId,authoredAt:plan.authoredAt,
          activity:stop.activity??null,purpose:stop.purpose??null,
        }),
      });
    }));
}
