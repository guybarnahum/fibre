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
// unknown the other is, plus the harm any person might do. Until trust is
// lived (S3), expected harm is the same species baseline toward everyone.
const TURN_COST=0.03;
const EXPECTED_HARM=0.5;
const MESSAGE_WEIGHT=0.5;
const RECOVERY_HALF_LIFE_MS=90*60_000;
const WINDOW_MS=12*3_600_000;

export function familiarityOf({experienceStore,threadId,otherThreadId,at}){
  if(otherThreadId===null||otherThreadId===threadId)return 0;
  const weight=experienceStore.listSharedContactTimes(threadId,otherThreadId,{before:at})
    .reduce((sum,when)=>sum+2**(-(Date.parse(at)-Date.parse(when))/(FAMILIARITY_HALF_LIFE_DAYS*DAY_MS)),0);
  return 1-2**(-weight/FAMILIARITY_SCALE);
}

// What one turn of talk (or one message) with a person costs this Body.
export function exposureCost({familiarity,kind="conversation"}){
  return TURN_COST*((1-familiarity)+EXPECTED_HARM)*(kind==="message"?MESSAGE_WEIGHT:1);
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
export function socialEnergyEvidence({threadId,experienceStore,asOf}){
  const since=new Date(Date.parse(asOf)-WINDOW_MS).toISOString();
  const exposures=experienceStore.listSocialExposures(threadId,{since,until:asOf});
  if(exposures.length===0)return null;
  const known=new Map();
  const familiarity=(otherThreadId)=>{
    if(!known.has(otherThreadId))known.set(otherThreadId,familiarityOf({experienceStore,threadId,otherThreadId,at:asOf}));
    return known.get(otherThreadId);
  };
  const depletion=socialDepletion(exposures.map(item=>({at:item.at,turns:item.turns,
    cost:exposureCost({familiarity:familiarity(item.otherThreadId),kind:item.kind})})),{asOf});
  return Object.freeze({depletion:Math.round(depletion*1_000_000)/1_000_000,
    evidenceRefs:Object.freeze(exposures.slice(0,4).map(item=>item.ref))});
}

// The battery during a conversation: where it stood when the talk began, and
// each turn spoken or heard since.
export function conversationDepletion({start,turns,familiarity}){
  return Math.min(1,(start?.depletion??0)+turns*exposureCost({familiarity}));
}
