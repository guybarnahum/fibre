// The social Body's World evidence (ADR-0036): how well this Thread knows
// another person and how up to date it is with them, how far it trusts them
// and what they did to it, and how spent it is by lived talk and messages.
// Mechanical and read-only, from World records alone; the Thread feels the
// result through its own urge loci and decides for itself what to do.

const DAY_MS=86_400_000;
const days=(from,to)=>(Date.parse(to)-Date.parse(from))/DAY_MS;

// Knowing: what each lived contact taught, by its depth. It barely fades (a
// contact's weight halves over two years) and the first meetings teach most.
const DEPTH=Object.freeze({noticed:0.25,message:0.5});
const depthOf=(contact)=>contact.kind==="conversation"?Math.min(2,1+0.1*contact.turns):DEPTH[contact.kind];
const KNOWING_HALF_LIFE_DAYS=730;
const KNOWING_SCALE=4;
// Being current: how up to date this Thread is with their life, halving
// every two weeks apart. Only someone known can be out of date.
const CURRENT_HALF_LIFE_DAYS=14;

// The battery: each turn of talk costs the Body in proportion to how
// unknown the other is, a little for catching up, plus the harm they might
// do. Expected harm starts at the same species baseline toward everyone and
// falls as trust is lived.
const TURN_COST=0.03;
const STALE_COST=0.25;
const EXPECTED_HARM=0.5;
const MESSAGE_WEIGHT=0.5;
const RECOVERY_HALF_LIFE_MS=90*60_000;
const WINDOW_MS=12*3_600_000;

// Trust is built safety (they could have hurt me, and did not), held down by
// the wounds they left. Built safety never expires. Four units of it make a
// person half-trusted.
const TRUST_SCALE=4;
const SAFE_ACTS=Object.freeze(["accepted","kept","opened","repaired"]);
// What counts as evidence of safety, and how much a harm weighs, is
// inherited (the trust locus's orientation); without one, the species way.
const SPECIES_WEIGHTS=Object.freeze({contact:1,accepted:1,kept:1,opened:1,repaired:1,declined:1,broken:2,closed:2,
  slighted:1,slighted_publicly:2});
const TRUST_WEIGHTS=Object.freeze({
  reliability:Object.freeze({...SPECIES_WEIGHTS,contact:0.5,accepted:2,kept:3,broken:3}),
  warmth:Object.freeze({...SPECIES_WEIGHTS,contact:1.5,declined:2,slighted:1.5,slighted_publicly:3}),
  reciprocity:Object.freeze({...SPECIES_WEIGHTS,accepted:2,opened:2,declined:1.5}),
  familiarity:Object.freeze({...SPECIES_WEIGHTS,contact:2,broken:1,closed:1}),
});
// A harm's severity: trivial, moderate, serious (grave harms arrive with the
// confidence, care and commitment doors). Grave and serious wounds leave a
// scar nothing heals; the rest heals over a time that grows with severity.
// A slight this Thread perceived (ADR-0037) is a harm too: trivial when it
// was private, and moderate before others, where it cost it standing.
const SEVERITY=Object.freeze({declined:1,slighted:1,broken:2,slighted_publicly:2,closed:4});
// A private slight spared one a worse one: that consideration is safety too.
const SPARED=0.5;
const SCAR=Object.freeze({1:0,2:0,4:0.25,8:0.6});
const healingHalfLifeDays=(severity)=>3*severity**2;
const REPEAT_WITHIN_DAYS=365;
// A new harm that re-opens a real part of an old wound is felt as such for a
// few days.
const REVIVED_ABOVE=0.25;
const REVIVED_FOR_DAYS=7;

function knowingOf(contacts,at){
  const depth=contacts.reduce((sum,contact)=>sum+depthOf(contact)*2**(-days(contact.at,at)/KNOWING_HALF_LIFE_DAYS),0);
  return 1-2**(-depth/KNOWING_SCALE);
}

// The wounds one person left, lived in order: each harm by its severity,
// weighing more from someone trusted, when repeated, and on top of an old
// history; each healing by time at this Body's inherited pace and by their
// later good conduct (never the scar); each new harm re-opening part of what
// had healed.
function livedTrust({contacts,acts,at,weights,pace}){
  const events=[...contacts.map(contact=>({at:contact.at,safe:depthOf(contact)*weights.contact})),
    ...acts.flatMap(act=>SEVERITY[act.kind]!==undefined
      ?[{at:act.occurredAt,harm:act.kind},...(act.kind==="slighted"?[{at:act.occurredAt,safe:SPARED}]:[])]
      :SAFE_ACTS.includes(act.kind)?[{at:act.occurredAt,safe:weights[act.kind]}]:[])]
    .sort((a,b)=>a.at.localeCompare(b.at));
  const wounds=[];
  let built=0,clock=null,revivedAt=null;
  const open=()=>wounds.reduce((sum,wound)=>sum+wound.scar+wound.healable,0);
  const trustNow=()=>(1-2**(-built/TRUST_SCALE))*2**(-open());
  const advance=(to)=>{
    if(clock!==null)for(const wound of wounds)
      wound.healable*=2**(-days(clock,to)/(healingHalfLifeDays(wound.severity)*pace));
    clock=to;
  };
  for(const event of events){
    advance(event.at);
    if(event.safe!==undefined){
      built+=event.safe;
      // A kindness heals little while the wound is fresh.
      for(const wound of wounds)
        wound.healable*=1-Math.min(1,0.1*event.safe*(1-(wound.scar+wound.healable)/wound.weight));
      continue;
    }
    const severity=SEVERITY[event.harm];
    const repeats=wounds.filter(wound=>wound.kind===event.harm&&days(wound.at,event.at)<=REPEAT_WITHIN_DAYS).length;
    const weight=severity*(weights[event.harm]/SPECIES_WEIGHTS[event.harm])*(1+trustNow())/4
      *1.5**repeats*(1+0.5*open());
    for(const wound of wounds){
      const healed=wound.weight-wound.scar-wound.healable;
      const reopened=Math.min(healed,healed*0.5*Math.min(1,severity/wound.severity)*(wound.kind===event.harm?2:1));
      wound.healable+=reopened;
      if(reopened>=REVIVED_ABOVE)revivedAt=event.at;
    }
    wounds.push({kind:event.harm,severity,at:event.at,weight,scar:weight*SCAR[severity],healable:weight*(1-SCAR[severity])});
  }
  advance(at);
  const held=open();
  return {trust:(1-2**(-built/TRUST_SCALE))*2**(-held),hurt:1-2**(-held),
    revived:revivedAt!==null&&days(revivedAt,at)<=REVIVED_FOR_DAYS};
}

const NO_ONE=Object.freeze({knowing:0,staleness:0,trust:0,hurt:0,revived:false,status:0,lately:Object.freeze([]),
  refusedLately:false,
  apartDays:null,apartInPersonDays:null});

// Status (ADR-0037): where another person stands relative to this Thread, as
// it perceived the regard between them. Each act lifts its actor above the
// other (+) or the other above its actor (−); an act counts double for the
// standing orientation it bears on. Status does not fade with absence: each
// act's weight halves for every twenty acts that came after it between them,
// so an order holds until it is lived differently.
const LIFT=Object.freeze({talked_over:1,corrected_publicly:1,left_out:1,corrected:0.5,overlooked:0.5,
  held_ground:0.5,gave_way:-1,credited:-0.5,asked_advice:-0.5});
const BEARS_ON=Object.freeze({talked_over:"deference",held_ground:"deference",gave_way:"deference",
  corrected:"competence",corrected_publicly:"competence",asked_advice:"competence",
  left_out:"belonging",overlooked:"recognition",credited:"recognition"});
const PUBLIC_ACTS=Object.freeze(["corrected_publicly","left_out"]);
const LATER_ACTS_HALVING=20;
const STATUS_SCALE=3;
const SLIGHT_FRESH_DAYS=1;

// An impression forms per episode, not per sentence: the same act by the
// same person toward the same person within a day counts once. A run of
// messages, each reflected on, then weighs no more than one conversation.
const EPISODE_DAYS=1;
function episodes(records){
  const kept=[];
  for(const record of [...records].sort((a,b)=>a.asOf.localeCompare(b.asOf)))
    if(!kept.some(item=>item.act===record.act&&item.actorThreadId===record.actorThreadId
      &&item.personThreadId===record.personThreadId&&days(item.asOf,record.asOf)<EPISODE_DAYS))kept.push(record);
  return kept;
}

// The acts of regard between this Thread and one person, newest first: what
// it perceived in reflection, and each interruption in their conversations.
function regardActs({records,contacts,at,otherThreadId}){
  const perceived=episodes(records).map(record=>({act:record.act,by:record.actorThreadId===otherThreadId?"them":"me",
    at:record.asOf,witnesses:record.witnesses??0,perceived:true}));
  const cut=contacts.filter(contact=>contact.interrupted).flatMap(contact=>[
    ...Array.from({length:contact.interrupted.me},()=>({act:"talked_over",by:"them",at:contact.at,
      witnesses:contact.witnesses??0,perceived:false})),
    ...Array.from({length:contact.interrupted.them},()=>({act:"talked_over",by:"me",at:contact.at,
      witnesses:contact.witnesses??0,perceived:false})),
  ]);
  return [...perceived,...cut].filter(act=>act.at<=at).sort((a,b)=>b.at.localeCompare(a.at));
}

function statusOf(acts,orientation){
  const lift=acts.reduce((sum,act,index)=>sum+LIFT[act.act]*(BEARS_ON[act.act]===orientation?2:1)
    *2**(-index/LATER_ACTS_HALVING)*(act.by==="them"?1:-1),0);
  return Math.tanh(lift/STATUS_SCALE);
}

// The regard this Body expects from a person: more from one it feels below
// it, more from one it is close to, more when it feels it counts here.
export function expectedRegard({status=0,bond=0,self=0}){
  return 0.5*(-status)+0.3*bond+0.2*self;
}
// The regard an act toward this Thread shows.
export const regardShown=(act)=>-LIFT[act];

// Where this Thread feels it stands in general (ADR-0037), from the regard it
// perceived with everyone, each person weighed by how much it has lived with
// them, leaned by its inherited selfRegard and lowered by slights before
// witnesses; and over the last two weeks, whether how it is treated matches
// what it expects (calm), falls short (frustration) or exceeds it.
const SELF_LEAN=0.4;
const WITNESS_LOSS=0.05,WITNESS_LOSS_CAP=0.4;
const CHRONIC_DAYS=14,CHRONIC_HALF_LIFE_DAYS=7;
export function selfStanding({experienceStore,threadId,at,standingLocus=null}){
  const records=episodes(experienceStore.listRecentPerceivedRegard?.(threadId,{before:at})??[]).reverse();
  const people=new Map();
  for(const record of records){
    if(!people.has(record.personThreadId))people.set(record.personThreadId,[]);
    people.get(record.personThreadId).push(record);
  }
  const orientation=standingLocus?.orientation??null;
  let weighed=0,base=0,loss=0;
  const status=new Map();
  for(const [person,items] of people){
    const acts=regardActs({records:items,contacts:[],at,otherThreadId:person});
    status.set(person,statusOf(acts,orientation));
    const weight=Math.min(1,acts.length/5);
    weighed+=weight;base+=weight*(-status.get(person));
    acts.forEach((act,index)=>{
      if(act.by==="them"&&LIFT[act.act]>0&&act.witnesses>0)
        loss+=WITNESS_LOSS*Math.min(4,act.witnesses)*2**(-index/LATER_ACTS_HALVING);
    });
  }
  const treated=weighed===0?0:base/weighed;
  const self=Math.max(-1,Math.min(1,treated
    +SELF_LEAN*(standingLocus?.selfRegard??0)-Math.min(WITNESS_LOSS_CAP,loss)));
  let gaps=0,weights=0,count=0;
  for(const record of records){
    const age=days(record.asOf,at);
    if(record.actorThreadId===threadId||age>CHRONIC_DAYS)continue;
    const weight=2**(-age/CHRONIC_HALF_LIFE_DAYS);
    // Over time, what is shown is set against the person's place and against
    // how far this Body's own sense of itself departs from how it is treated:
    // a match is calm, a Body that rates itself above its treatment is
    // frustrated, one that rates itself below it is gratified.
    gaps+=weight*(regardShown(record.act)-(0.5*(-status.get(record.personThreadId))+(self-treated)));
    weights+=weight;count+=1;
  }
  return Object.freeze({self:rounded(self),gap:count===0?null:rounded(gaps/weights),acts:count,
    evidenceRefs:Object.freeze(records.slice(0,4).map(record=>record.regardId))});
}
const rounded=(value)=>Math.round(value*1e6)/1e6;

// How this Thread's Body regards another person, from the lived contact and
// the relational acts World recorded between them: how well it knows them,
// how out of date it is with them, how far it trusts them, how much what they
// did still hurts, and whether a new hurt has just brought back an old one.
// The trust locus ({orientation, persistence}, already scaled by inherited
// spread) says what counts as safety and how fast this Body forgives.
export function regardOf({experienceStore,threadId,otherThreadId,at,trustLocus=null,standingLocus=null}){
  if(otherThreadId===null||otherThreadId===threadId)return NO_ONE;
  const contacts=experienceStore.listSharedContact(threadId,otherThreadId,{before:at});
  const regard=regardActs({contacts,at,otherThreadId,
    records:experienceStore.listPerceivedRegard?.(threadId,otherThreadId,{before:at})??[]});
  const slights=regard.filter(act=>act.by==="them"&&LIFT[act.act]>0&&act.perceived)
    .map(act=>({kind:act.witnesses>0||PUBLIC_ACTS.includes(act.act)?"slighted_publicly":"slighted",occurredAt:act.at}));
  const acts=[...experienceStore.listPairActs(threadId,otherThreadId,{before:at})
    .filter(act=>act.actorThreadId===otherThreadId),...slights];
  const knowing=knowingOf(contacts,at);
  const latest=(items)=>items.reduce((when,contact)=>when===null||contact.at>when?contact.at:when,null);
  const last=latest(contacts),lastInPerson=latest(contacts.filter(contact=>contact.kind!=="message"));
  const current=last===null?0:2**(-days(last,at)/CURRENT_HALF_LIFE_DAYS);
  const lived=livedTrust({contacts,acts,at,weights:TRUST_WEIGHTS[trustLocus?.orientation]??SPECIES_WEIGHTS,
    pace:2**(2*(trustLocus?.persistence??0))});
  return Object.freeze({knowing:rounded(knowing),staleness:rounded(knowing*(1-current)),
    trust:rounded(lived.trust),hurt:rounded(lived.hurt),revived:lived.revived,
    status:rounded(statusOf(regard,standingLocus?.orientation??null)),
    refusedLately:acts.some(act=>act.kind==="declined"&&days(act.occurredAt,at)<=SLIGHT_FRESH_DAYS),
    lately:Object.freeze(regard.filter(act=>act.by==="them"&&days(act.at,at)<=SLIGHT_FRESH_DAYS).slice(0,3)),
    apartDays:last===null?null:rounded(days(last,at)),
    apartInPersonDays:lastInPerson===null?null:rounded(days(lastInPerson,at))});
}

// The bond (ADR-0036 R2): how much a person has come to matter to this Body,
// from how well it knows them, how far it trusts them, and the doors they
// have opened to each other. Being able to talk counts a little; reaching
// each other, meeting by arrangement and sharing places count more. A
// stranger has none, so a stranger is never missed.
const DOOR_BOND=Object.freeze({conversation:0.2,contact:0.3,time:0.3,place:0.2,
  confidence:0.4,care:0.4,romance:0.4,commitment:0.4});
export function bondOf({regard,doors}){
  const opened=Math.min(1,doors.reduce((sum,door)=>sum+(DOOR_BOND[door]??0),0));
  return rounded(regard.knowing*regard.trust*opened);
}

// Longing for a bonded person: barely there the next day, it grows over the
// first week apart and then, for all but the deepest bond, settles into fond
// memory, more slowly the more persistent this Body's attachment locus
// (persistence already scaled by inherited spread). Apart means not in each
// other's presence, except for a Body whose attachment is to the exchange
// itself, which a message answers.
export function longingOf({bond,regard,orientation=null,persistence=0}){
  const apart=orientation==="reciprocal_contact"?regard.apartDays:regard.apartInPersonDays;
  if(bond===0||apart===null)return 0;
  const rise=(1-2**(-apart/3))**2;
  const settle=2**(-Math.max(0,apart-7)*(1-bond)/(21*2**(2*persistence)));
  return rounded(bond*rise*settle);
}

// What one turn of talk (or one message) with a person costs this Body.
export function exposureCost({knowing=0,staleness=0,trust=0,kind="conversation"}){
  return TURN_COST*((1-knowing)+STALE_COST*staleness+EXPECTED_HARM*(1-trust))*(kind==="message"?MESSAGE_WEIGHT:1);
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
export function socialEnergyEvidence({threadId,experienceStore,asOf,trustLocus=null}){
  const since=new Date(Date.parse(asOf)-WINDOW_MS).toISOString();
  const exposures=experienceStore.listSocialExposures(threadId,{since,until:asOf});
  if(exposures.length===0)return null;
  const known=new Map();
  const regard=(otherThreadId)=>{
    if(!known.has(otherThreadId))known.set(otherThreadId,
      regardOf({experienceStore,threadId,otherThreadId,at:asOf,trustLocus}));
    return known.get(otherThreadId);
  };
  const depletion=socialDepletion(exposures.map(item=>({at:item.at,turns:item.turns,
    cost:exposureCost({...regard(item.otherThreadId),kind:item.kind})})),{asOf});
  return Object.freeze({depletion:rounded(depletion),
    evidenceRefs:Object.freeze(exposures.slice(0,4).map(item=>item.ref))});
}

// The battery during a conversation: where it stood when the talk began, and
// each turn spoken or heard since.
// Going over ground this Body is weary of costs a little more (S5b).
export function conversationDepletion({start,turns,knowing=0,staleness=0,trust=0,weariness=0}){
  return Math.min(1,(start?.depletion??0)+turns*(exposureCost({knowing,staleness,trust})+0.5*weariness*TURN_COST));
}
