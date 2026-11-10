// The social Body's World evidence (ADR-0036): how known another person is,
// and how spent this Body is by lived talk and messages. Mechanical and
// read-only, from World records alone; the Thread feels the result through
// its own urge loci and decides for itself what to do about it.

const DAY_MS=86_400_000;
// Familiarity: each lived contact counts less as it ages; four recent ones
// make a person half-known.
const FAMILIARITY_HALF_LIFE_DAYS=14;
const FAMILIARITY_SCALE=4;
// The battery: each turn of talk costs the Body in proportion to how
// unknown the other is, plus the harm they might do. Expected harm starts at
// the same species baseline toward everyone and falls as trust is lived.
const TURN_COST=0.03;
const EXPECTED_HARM=0.5;
// Trust (S3) is reduced expected harm: they could have hurt me, and did not.
// Lived contact without harm and acts that kept faith raise it; acts that
// broke faith lower it; all of it fades with age. Four recent safe exposures
// make a person half-trusted, and each unit of harm halves what was built.
const TRUST_SCALE=4;
const SAFE_ACTS=Object.freeze(["accepted","kept","opened","repaired"]);
const HARM_ACTS=Object.freeze(["declined","broken","closed"]);
// What counts as evidence of safety is inherited (the trust locus's
// orientation); without one, every kind counts the species way.
const SPECIES_WEIGHTS=Object.freeze({contact:1,accepted:1,kept:1,opened:1,repaired:1,declined:1,broken:2,closed:2});
const TRUST_WEIGHTS=Object.freeze({
  reliability:Object.freeze({...SPECIES_WEIGHTS,contact:0.5,accepted:2,kept:3,broken:3}),
  warmth:Object.freeze({...SPECIES_WEIGHTS,contact:1.5,declined:2}),
  reciprocity:Object.freeze({...SPECIES_WEIGHTS,accepted:2,opened:2,declined:1.5}),
  familiarity:Object.freeze({...SPECIES_WEIGHTS,contact:2,broken:1,closed:1}),
});
const MESSAGE_WEIGHT=0.5;
const RECOVERY_HALF_LIFE_MS=90*60_000;
const WINDOW_MS=12*3_600_000;

const aged=(at,when)=>2**(-(Date.parse(at)-Date.parse(when))/(FAMILIARITY_HALF_LIFE_DAYS*DAY_MS));

export function familiarityOf({experienceStore,threadId,otherThreadId,at}){
  if(otherThreadId===null||otherThreadId===threadId)return 0;
  const lived=experienceStore.listSharedContactTimes(threadId,otherThreadId,{before:at})
    .reduce((sum,when)=>sum+aged(at,when),0);
  return 1-2**(-lived/FAMILIARITY_SCALE);
}

// How known and how trusted another person is to this Thread, from the lived
// contact and the relational acts World recorded between them.
export function regardOf({experienceStore,threadId,otherThreadId,at,trustOrientation=null}){
  if(otherThreadId===null||otherThreadId===threadId)return Object.freeze({familiarity:0,trust:0});
  const contact=experienceStore.listSharedContactTimes(threadId,otherThreadId,{before:at});
  const lived=contact.reduce((sum,when)=>sum+aged(at,when),0);
  const weights=TRUST_WEIGHTS[trustOrientation]??SPECIES_WEIGHTS;
  let safe=lived*weights.contact,harm=0;
  for(const act of experienceStore.listPairActs(threadId,otherThreadId,{before:at})){
    if(act.actorThreadId!==otherThreadId)continue;
    if(SAFE_ACTS.includes(act.kind))safe+=weights[act.kind]*aged(at,act.occurredAt);
    if(HARM_ACTS.includes(act.kind))harm+=weights[act.kind]*aged(at,act.occurredAt);
  }
  return Object.freeze({familiarity:1-2**(-lived/FAMILIARITY_SCALE),
    trust:(1-2**(-safe/TRUST_SCALE))*2**(-harm)});
}

// What one turn of talk (or one message) with a person costs this Body.
export function exposureCost({familiarity,trust=0,kind="conversation"}){
  return TURN_COST*((1-familiarity)+EXPECTED_HARM*(1-trust))*(kind==="message"?MESSAGE_WEIGHT:1);
}

// Depletion after a run of exposures, recovering between them and after the
// last one (exposures: {at, turns, cost} in any order).
export function socialDepletion(exposures,{asOf}){
  let depletion=0,last=null;
  for(const item of [...exposures].sort((a,b)=>a.at.localeCompare(b.at))){
    if(last!==null)depletion*=2**(-(Date.parse(item.at)-Date.parse(last))/RECOVERY_HALF_LIFE_MS);
    depletion=Math.min(1,depletion+item.turns*item.cost);
    last=item.at;
  }
  return last===null?0:depletion*2**(-(Date.parse(asOf)-Date.parse(last))/RECOVERY_HALF_LIFE_MS);
}

// The battery as World knows it at asOf, from the last half-day of lived talk
// and messages; null when there was none.
export function socialEnergyEvidence({threadId,experienceStore,asOf,trustOrientation=null}){
  const since=new Date(Date.parse(asOf)-WINDOW_MS).toISOString();
  const exposures=experienceStore.listSocialExposures(threadId,{since,until:asOf});
  if(exposures.length===0)return null;
  const known=new Map();
  const regard=(otherThreadId)=>{
    if(!known.has(otherThreadId))known.set(otherThreadId,
      regardOf({experienceStore,threadId,otherThreadId,at:asOf,trustOrientation}));
    return known.get(otherThreadId);
  };
  const depletion=socialDepletion(exposures.map(item=>({at:item.at,turns:item.turns,
    cost:exposureCost({...regard(item.otherThreadId),kind:item.kind})})),{asOf});
  return Object.freeze({depletion:Math.round(depletion*1_000_000)/1_000_000,
    evidenceRefs:Object.freeze(exposures.slice(0,4).map(item=>item.ref))});
}

// The battery during a conversation: where it stood when the talk began, and
// each turn spoken or heard since.
export function conversationDepletion({start,turns,familiarity,trust=0}){
  return Math.min(1,(start?.depletion??0)+turns*exposureCost({familiarity,trust}));
}
